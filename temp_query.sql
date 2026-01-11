SELECT "managementCode", COUNT(*) as cnt FROM process_verification_items GROUP BY "managementCode" HAVING COUNT(*) > 1 LIMIT 10;
