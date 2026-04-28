#!/bin/bash
# ============================================================
# AI Lecture Platform - 프로덕션 배포 자동화 스크립트
# 대상 서버: aispeaker.cc (AWS Lightsail)
# 사용법: ./deploy.sh [SERVER_IP] [SSH_KEY_PATH]
# 예시:   ./deploy.sh 52.76.85.132 ~/.ssh/lightsail-key.pem
# ============================================================

set -euo pipefail

# ===== 설정 =====
DEPLOY_DIR="/opt/aispeaker/app"
SERVICE_NAME="aispeaker"
DOMAIN="aispeaker.cc"
BUILD_DIR="dist"
NODE_VERSION="22"

# ===== 인자 처리 =====
SERVER_IP="${1:-}"
SSH_KEY="${2:-~/.ssh/lightsail-key.pem}"

if [ -z "$SERVER_IP" ]; then
  echo "============================================"
  echo "  AI Lecture Platform 배포 스크립트"
  echo "============================================"
  echo ""
  echo "사용법: ./deploy.sh <SERVER_IP> [SSH_KEY_PATH]"
  echo ""
  echo "예시:"
  echo "  ./deploy.sh 52.76.85.132"
  echo "  ./deploy.sh 52.76.85.132 ~/.ssh/my-key.pem"
  echo ""
  echo "환경변수로도 설정 가능:"
  echo "  DEPLOY_SERVER=52.76.85.132 ./deploy.sh"
  echo ""
  exit 1
fi

# 환경변수 우선
SERVER_IP="${DEPLOY_SERVER:-$SERVER_IP}"

SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=10"
SSH_CMD="ssh $SSH_OPTS -i $SSH_KEY ubuntu@$SERVER_IP"
SCP_CMD="scp $SSH_OPTS -i $SSH_KEY"

# ===== 색상 =====
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ===== 단계 1: 로컬 빌드 =====
echo ""
echo "============================================"
echo "  단계 1/6: 로컬 빌드"
echo "============================================"

log_info "TypeScript 타입 체크..."
if npx tsc --noEmit 2>&1 | head -5 | grep -q "error"; then
  log_error "TypeScript 에러가 있습니다. 빌드를 중단합니다."
  npx tsc --noEmit 2>&1 | head -20
  exit 1
fi
log_ok "타입 체크 통과"

log_info "프로덕션 빌드 시작..."
pnpm build
log_ok "빌드 완료"

# ===== 단계 2: 배포 패키지 생성 =====
echo ""
echo "============================================"
echo "  단계 2/6: 배포 패키지 생성"
echo "============================================"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOY_PACKAGE="deploy_${TIMESTAMP}.tar.gz"

log_info "배포 패키지 생성: $DEPLOY_PACKAGE"

# 빌드 결과물 + 필요 파일만 패키징
tar -czf "/tmp/$DEPLOY_PACKAGE" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.manus-logs' \
  --exclude='client/src' \
  --exclude='*.test.ts' \
  --exclude='*.test.js' \
  dist/ \
  package.json \
  pnpm-lock.yaml \
  drizzle/ \
  server/ \
  shared/ \
  storage/ \
  2>/dev/null || true

PACKAGE_SIZE=$(du -h "/tmp/$DEPLOY_PACKAGE" | cut -f1)
log_ok "패키지 생성 완료 ($PACKAGE_SIZE)"

# ===== 단계 3: 서버 연결 확인 =====
echo ""
echo "============================================"
echo "  단계 3/6: 서버 연결 확인"
echo "============================================"

log_info "서버 연결 테스트: $SERVER_IP"
if ! $SSH_CMD "echo 'connected'" >/dev/null 2>&1; then
  log_error "서버에 연결할 수 없습니다: $SERVER_IP"
  log_error "SSH 키 경로를 확인하세요: $SSH_KEY"
  exit 1
fi
log_ok "서버 연결 성공"

# 서버 정보 출력
$SSH_CMD "echo '  OS: ' \$(lsb_release -ds 2>/dev/null || cat /etc/os-release | head -1); echo '  Disk: ' \$(df -h / | tail -1 | awk '{print \$4 \" free\"}'); echo '  Memory: ' \$(free -h | awk '/Mem/{print \$7 \" available\"}')"

# ===== 단계 4: 서버에 업로드 =====
echo ""
echo "============================================"
echo "  단계 4/6: 서버에 업로드"
echo "============================================"

log_info "배포 패키지 업로드 중..."
$SCP_CMD "/tmp/$DEPLOY_PACKAGE" "ubuntu@$SERVER_IP:/tmp/$DEPLOY_PACKAGE"
log_ok "업로드 완료"

# ===== 단계 5: 서버에서 배포 실행 =====
echo ""
echo "============================================"
echo "  단계 5/6: 서버 배포 실행"
echo "============================================"

$SSH_CMD << REMOTE_SCRIPT
set -euo pipefail

echo "[REMOTE] 배포 디렉토리 준비..."
sudo mkdir -p $DEPLOY_DIR
sudo chown -R ubuntu:ubuntu $DEPLOY_DIR

# 백업 생성
if [ -d "$DEPLOY_DIR/dist" ]; then
  BACKUP_DIR="${DEPLOY_DIR}_backup_${TIMESTAMP}"
  echo "[REMOTE] 기존 배포 백업: \$BACKUP_DIR"
  sudo cp -r $DEPLOY_DIR/dist "\$BACKUP_DIR" 2>/dev/null || true
fi

echo "[REMOTE] 패키지 압축 해제..."
cd $DEPLOY_DIR
tar -xzf /tmp/$DEPLOY_PACKAGE

echo "[REMOTE] 의존성 설치..."
if command -v pnpm &>/dev/null; then
  pnpm install --prod --frozen-lockfile 2>/dev/null || pnpm install --prod
else
  npm install --production
fi

echo "[REMOTE] 임시 파일 정리..."
rm -f /tmp/$DEPLOY_PACKAGE

# Docker 또는 systemd 재시작
if [ -f "$DEPLOY_DIR/docker-compose.yml" ] || [ -f "$DEPLOY_DIR/Dockerfile" ]; then
  echo "[REMOTE] Docker 컨테이너 재시작..."
  cd $DEPLOY_DIR
  if command -v docker-compose &>/dev/null; then
    sudo docker-compose down && sudo docker-compose up -d --build
  elif command -v docker &>/dev/null && sudo docker ps -a --format '{{.Names}}' | grep -q "$SERVICE_NAME"; then
    sudo docker restart $SERVICE_NAME
  fi
elif sudo systemctl is-active --quiet $SERVICE_NAME 2>/dev/null; then
  echo "[REMOTE] systemd 서비스 재시작..."
  sudo systemctl restart $SERVICE_NAME
  sleep 2
  if sudo systemctl is-active --quiet $SERVICE_NAME; then
    echo "[REMOTE] 서비스 상태: active (running)"
  else
    echo "[REMOTE] 서비스 시작 실패! 로그 확인:"
    sudo journalctl -u $SERVICE_NAME --no-pager -n 20
    exit 1
  fi
elif command -v pm2 &>/dev/null; then
  echo "[REMOTE] PM2 프로세스 재시작..."
  cd $DEPLOY_DIR
  pm2 restart $SERVICE_NAME 2>/dev/null || pm2 start dist/index.js --name $SERVICE_NAME
else
  echo "[REMOTE] 프로세스 매니저를 찾을 수 없습니다. 수동으로 시작해주세요:"
  echo "  cd $DEPLOY_DIR && NODE_ENV=production node dist/index.js"
fi

echo "[REMOTE] 배포 완료!"
REMOTE_SCRIPT

log_ok "서버 배포 실행 완료"

# ===== 단계 6: 배포 검증 =====
echo ""
echo "============================================"
echo "  단계 6/6: 배포 검증"
echo "============================================"

log_info "서비스 상태 확인 중..."
sleep 3

# HTTP 헬스체크
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "https://$DOMAIN" 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
  log_ok "HTTPS 접속 확인: $DOMAIN (HTTP $HTTP_STATUS)"
else
  log_warn "HTTPS 접속 실패 (HTTP $HTTP_STATUS). 서버 시작에 시간이 걸릴 수 있습니다."
  log_info "10초 후 재시도..."
  sleep 10
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "https://$DOMAIN" 2>/dev/null || echo "000")
  if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
    log_ok "HTTPS 접속 확인: $DOMAIN (HTTP $HTTP_STATUS)"
  else
    log_error "배포 후 서비스 접속 실패 (HTTP $HTTP_STATUS)"
    log_info "서버 로그를 확인하세요:"
    echo "  ssh -i $SSH_KEY ubuntu@$SERVER_IP 'sudo journalctl -u $SERVICE_NAME -n 50'"
  fi
fi

# 로컬 임시 파일 정리
rm -f "/tmp/$DEPLOY_PACKAGE"

echo ""
echo "============================================"
echo "  배포 완료!"
echo "============================================"
echo ""
echo "  도메인: https://$DOMAIN"
echo "  서버:   $SERVER_IP"
echo "  시간:   $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "  롤백 명령어:"
echo "  ssh -i $SSH_KEY ubuntu@$SERVER_IP 'cd $DEPLOY_DIR && sudo cp -r ${DEPLOY_DIR}_backup_${TIMESTAMP}/* dist/ && sudo systemctl restart $SERVICE_NAME'"
echo ""
