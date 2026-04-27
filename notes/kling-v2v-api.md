# Kling Video Effects API

## Endpoint
POST /v1/videos/effects

## Request
```json
{
  "effect_scene": "color_mixing",  // 263 effects available
  "input": {
    "image": "url_or_base64"  // single image
    // OR "images": ["url1", "url2"]  // dual image (13 effects)
  },
  "callback_url": "optional",
  "external_task_id": "optional"
}
```

## Query Status
GET /v1/videos/effects/{task_id}

## Response
```json
{
  "code": 0,
  "data": {
    "task_id": "string",
    "task_status": "submitted|processing|succeed|failed",
    "task_result": {
      "videos": [{ "id": "string", "url": "string" }]
    }
  }
}
```

## Popular Effects
- Single-image: color_mixing, bullet_time, 3d_cartoon_2, anime_figure, yearbook, steampunk, mythic_style, japanese_anime_1, american_comics
- Dual-image: fight_pro, hug_pro, heart_gesture_pro, kiss_pro, cheers_2026
