type Service = typeof import('@/lib/admin/service');
type AsyncFn<T> = T extends (...args: infer A) => infer R ? (...args: A) => Promise<Awaited<R>> : never;

export function dataBackend() {
  return process.env.DATA_BACKEND === 'firebase' ? 'firebase' : 'sqlite';
}

async function backend() {
  const loaded = dataBackend() === 'firebase' ? await import('@/lib/admin/firebase-service') : await import('@/lib/admin/service');
  return loaded as Record<string, (...args: never[]) => unknown>;
}

function bind<K extends keyof Service>(name: K): AsyncFn<Service[K]> {
  return (async (...args: never[]) => {
    const api = await backend();
    return api[String(name)](...args);
  }) as AsyncFn<Service[K]>;
}

export const actorFromToken = bind('actorFromToken');
export const authenticate = bind('authenticate');
export const createSession = bind('createSession');
export const destroySession = bind('destroySession');
export const listCategories = bind('listCategories');
export const saveCategory = bind('saveCategory');
export const setCategoryStatus = bind('setCategoryStatus');
export const moveCategory = bind('moveCategory');
export const saveMenuItem = bind('saveMenuItem');
export const setMenuItemStatus = bind('setMenuItemStatus');
export const moveMenuItem = bind('moveMenuItem');
export const listStops = bind('listStops');
export const saveStop = bind('saveStop');
export const listPackages = bind('listPackages');
export const savePackage = bind('savePackage');
export const listInquiries = bind('listInquiries');
export const consumeRateLimit = bind('consumeRateLimit');
export const recordPublicInquiry = bind('recordPublicInquiry');
export const deliverInquiryNotification = bind('deliverInquiryNotification');
export const retryInquiryNotification = bind('retryInquiryNotification');
export const updateInquiry = bind('updateInquiry');
export const listPromotions = bind('listPromotions');
export const savePromotion = bind('savePromotion');
export const readSiteDocument = bind('readSiteDocument');
export const saveSiteDraft = bind('saveSiteDraft');
export const publishSite = bind('publishSite');
export const rollbackSite = bind('rollbackSite');
export const listAudit = bind('listAudit');
export const listUsers = bind('listUsers');
export const inviteOwner = bind('inviteOwner');
export const setUserDisabled = bind('setUserDisabled');
export const readSettings = bind('readSettings');
export const saveMeasurementId = bind('saveMeasurementId');
export const diagnostics = bind('diagnostics');
export const recordAnalytics = bind('recordAnalytics');
export const recordStoredImage = bind('recordStoredImage');
export const notificationSummary = bind('notificationSummary');
export const analyticsReport = bind('analyticsReport');
export const publishedMenu = bind('publishedMenu');
export const publishedSite = bind('publishedSite');
export const publishedStops = bind('publishedStops');
export const activePromotions = bind('activePromotions');
export const publishedPackages = bind('publishedPackages');
export const publicEmail = bind('publicEmail');
export const measurementId = bind('measurementId');
