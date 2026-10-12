import { planSqliteImport, exportPlan, applySqliteImport } from '@/lib/admin/firebase-import';

const apply = process.argv.includes('--apply');
const exportIndex = process.argv.indexOf('--export');

if (apply && process.argv.includes('--dry-run')) {
  throw new Error('Choose either --apply or --dry-run.');
}

const plan = planSqliteImport();
const summary = {
  counts: plan.counts,
  statuses: plan.statuses,
  orphanMenuItems: plan.orphanMenuItems,
  ok: plan.ok,
  executed: false,
};
console.log(JSON.stringify(summary, null, 2));

if (exportIndex >= 0) {
  const destination = process.argv[exportIndex + 1] || `data/exports/firestore-plan-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const exported = exportPlan(undefined, destination);
  console.log(JSON.stringify({ exported: exported.destination, ok: exported.ok }));
}

if (!apply) {
  console.log('Dry run only. No Firestore writes were made.');
  process.exit(plan.ok ? 0 : 1);
}

const result = await applySqliteImport();
console.log(JSON.stringify({ created: result.created, skipped: result.skipped, imported: result.imported, executed: true }));
