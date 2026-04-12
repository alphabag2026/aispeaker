// Seed avatar images into sampleFaces table
// Maps actual DB names to generated AI avatar images
import 'dotenv/config';
import mysql from 'mysql2/promise';

const avatarUpdates = [
  {
    id: 1, // Dr. Anya Sharma - female, East Asian, 20s, professional
    imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/sujin-CSpzn9qPnpAihujRUTPN2j.png",
    thumbnailUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/sujin-e5Z7aPf6LEo6VGtsXkheVW.webp",
  },
  {
    id: 2, // Prof. Elias Thorne - male, Caucasian, 50s, academic
    imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/david-HNrKxFQMkY87JaRELERF2Y.png",
    thumbnailUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/david-MVGQVCbgN8zM6GTm9hr5ba.webp",
  },
  {
    id: 3, // Dr. Nia Adebayo - female, Black, 30s, professional
    imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/priya-HDfyG97cit9yXAt8vqw6qg.png",
    thumbnailUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/priya-f6CdXiiDQBpoSjqhmZUfmG.webp",
  },
  {
    id: 4, // Kenji Tanaka - male, East Asian, 30s, corporate
    imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/junho-NGcnSiiBxed9zD3cNxdNNV.png",
    thumbnailUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/junho-AkzWtddgouqtAdtsJk7KHS.webp",
  },
  {
    id: 5, // Rajiv Kapoor - male, South Asian, 40s, professional
    imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/marcus-JPNL3vqxBHyWn7iNkzWEfK.png",
    thumbnailUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/marcus-PdDmHupbAtqiVFQXaXF5EB.webp",
  },
];

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  for (const avatar of avatarUpdates) {
    const [result] = await conn.execute(
      `UPDATE sampleFaces SET imageUrl = ?, thumbnailUrl = ? WHERE id = ?`,
      [avatar.imageUrl, avatar.thumbnailUrl, avatar.id]
    );
    console.log(`Updated id=${avatar.id}: ${result.affectedRows} rows`);
  }
  
  // Verify
  const [rows] = await conn.execute('SELECT id, name, imageUrl, thumbnailUrl FROM sampleFaces');
  console.log("\nFinal state:");
  for (const r of rows) {
    console.log(`  ${r.id}. ${r.name} => image: ${r.imageUrl ? 'SET' : 'EMPTY'}, thumb: ${r.thumbnailUrl ? 'SET' : 'EMPTY'}`);
  }
  
  await conn.end();
  console.log("\nDone!");
}

main().catch(console.error);
