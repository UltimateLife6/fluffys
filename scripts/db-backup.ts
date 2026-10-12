import { backupSqlite } from '@/lib/admin/backup';

const result = backupSqlite();
console.log(`Backup written to ${result.destination}`);
console.log(JSON.stringify(result.counts));
