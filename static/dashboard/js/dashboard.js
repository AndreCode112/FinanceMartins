const dashboardElement = document.getElementById("dashboard-data");
const initialData = JSON.parse(dashboardElement.textContent);
const bodyData = document.body.dataset;

let transactions = initialData.transactions || [];
let payables = initialData.payables || [];
let banks = initialData.banks || [];
let events = initialData.events || [];
let payableCategories = initialData.categories || [];
let activeBankFilter = "all";
let transactionSearchQuery = "";
let transactionTypeFilter = "all";
let transactionPeriodFilter = "all";
let eventSearchQuery = "";
let eventStatusFilter = "all";
let eventImportanceFilter = "all";
let eventViewMode = "month";
let payableSearchQuery = "";
let payableStatusFilter = "all";
let payableTypeFilter = "all";
let payableCategoryFilter = "all";
let payableBankFilter = "all";
let payablePeriodFilter = "all";
let payableExactDateFilter = "";
let activeTab = "dashboard";
let chart = null;
let deleteCandidateId = null;
let eventDeleteCandidateId = null;
let payableDeleteCandidateId = null;
let bankDeleteCandidateId = null;
let activeInstallmentDetailsId = null;
let pendingReceiptPromptInstallmentId = null;
let receiptUploadInstallmentId = null;
let activeHistoryInstallmentId = null;
let payableCalendarCursorDate = new Date(`${initialData.today}T00:00:00`);
let eventCursorDate = new Date(`${initialData.today}T00:00:00`);
let draggedEventId = null;

const monthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const payableTypeLabels = {
    invoice: "Fatura",
    subscription: "Assinatura",
    debt: "Divida",
    installment: "Parcela",
    other: "Outro",
};
const eventImportanceLabels = {
    low: "Baixa",
    medium: "Media",
    high: "Alta",
    critical: "Critica",
};
const eventStatusLabels = {
    pending: "Pendente",
    completed: "Concluido",
    canceled: "Cancelado",
};

const sidebarMenu = document.getElementById("sidebarMenu");
const tabMenuItems = sidebarMenu ? sidebarMenu.querySelectorAll(".menu-item[data-tab]") : [];
const tabContents = document.querySelectorAll("[data-tab-content]");
const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeToggleIcon = document.getElementById("themeToggleIcon");
const themeToggleLabel = document.getElementById("themeToggleLabel");
const userDropdown = document.getElementById("userDropdown");
const userDropdownTrigger = document.getElementById("userDropdownTrigger");
const userDropdownMenu = document.getElementById("userDropdownMenu");
const sidebarElement = document.getElementById("appSidebar");
const mobileSidebarBtn = document.getElementById("mobileSidebarBtn");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const dashboardLayoutContainer = document.getElementById("dashboardLayout");
const calendarLayoutContainer = document.getElementById("calendarLayout");
const payablesLayoutContainer = document.getElementById("payablesLayout");
const banksLayoutContainer = document.getElementById("banksLayout");
const sidebarCollapsedStorageKey = "financepulse:sidebar-collapsed";
const dashboardLayoutStorageKey = "financepulse:dashboard-layout";
const calendarLayoutStorageKey = "financepulse:calendar-layout";
const payablesLayoutStorageKey = "financepulse:payables-layout";
const banksLayoutStorageKey = "financepulse:banks-layout";
const themeModeStorageKey = "financepulse:theme-mode";
let sidebarAnimationTimeoutId = null;
let mobileSidebarOpen = false;

const transactionsBody = document.getElementById("transactionsBody");
const summaryBalance = document.getElementById("summaryBalance");
const summaryIncome = document.getElementById("summaryIncome");
const summaryExpense = document.getElementById("summaryExpense");
const summaryCount = document.getElementById("summaryCount");
const transactionsSubtitle = document.getElementById("transactionsSubtitle");
const bankFilterContainer = document.getElementById("bankFilter");
const dashboardRemindersSubtitle = document.getElementById("dashboardRemindersSubtitle");
const dashboardRemindersList = document.getElementById("dashboardRemindersList");
const dashboardReconciliationSubtitle = document.getElementById("dashboardReconciliationSubtitle");
const dashboardReconciliationList = document.getElementById("dashboardReconciliationList");
const transactionSearchInput = document.getElementById("transactionSearchInput");
const transactionTypeFilterSelect = document.getElementById("transactionTypeFilter");
const transactionPeriodFilterSelect = document.getElementById("transactionPeriodFilter");
const clearTransactionFiltersBtn = document.getElementById("clearTransactionFilters");
const summaryEventTotal = document.getElementById("summaryEventTotal");
const summaryEventPending = document.getElementById("summaryEventPending");
const summaryEventCompleted = document.getElementById("summaryEventCompleted");
const summaryEventCritical = document.getElementById("summaryEventCritical");
const eventSearchInput = document.getElementById("eventSearchInput");
const eventStatusFilterSelect = document.getElementById("eventStatusFilter");
const eventImportanceFilterSelect = document.getElementById("eventImportanceFilter");
const eventViewFilterSelect = document.getElementById("eventViewFilter");
const clearEventFiltersBtn = document.getElementById("clearEventFilters");
const openEventModalBtn = document.getElementById("openEventModal");
const eventPrevBtn = document.getElementById("eventPrevBtn");
const eventNextBtn = document.getElementById("eventNextBtn");
const eventTodayBtn = document.getElementById("eventTodayBtn");
const eventCurrentPeriod = document.getElementById("eventCurrentPeriod");
const eventViewContainer = document.getElementById("eventViewContainer");
const eventReminderSubtitle = document.getElementById("eventReminderSubtitle");
const eventReminderList = document.getElementById("eventReminderList");

const payablesBody = document.getElementById("payablesBody");
const summaryPayablePending = document.getElementById("summaryPayablePending");
const summaryPayableOverdue = document.getElementById("summaryPayableOverdue");
const summaryPayablePaid = document.getElementById("summaryPayablePaid");
const summaryPayableCount = document.getElementById("summaryPayableCount");
const payablesSubtitle = document.getElementById("payablesSubtitle");
const payableSearchInput = document.getElementById("payableSearchInput");
const payableStatusFilterSelect = document.getElementById("payableStatusFilter");
const payableTypeFilterSelect = document.getElementById("payableTypeFilter");
const payableCategoryFilterSelect = document.getElementById("payableCategoryFilter");
const payableBankFilterSelect = document.getElementById("payableBankFilter");
const payablePeriodFilterSelect = document.getElementById("payablePeriodFilter");
const clearPayableFiltersBtn = document.getElementById("clearPayableFilters");
const payableBulkActionField = document.getElementById("payableBulkActionField");
const payableBulkPaymentDateWrap = document.getElementById("payableBulkPaymentDateWrap");
const payableBulkPaymentDateField = document.getElementById("payableBulkPaymentDateField");
const payableBulkPaymentNoteWrap = document.getElementById("payableBulkPaymentNoteWrap");
const payableBulkPaymentNoteField = document.getElementById("payableBulkPaymentNoteField");
const applyPayableBulkActionBtn = document.getElementById("applyPayableBulkActionBtn");
const payableBulkSummary = document.getElementById("payableBulkSummary");
const payableBulkActionError = document.getElementById("payableBulkActionError");
const payableCategoryForm = document.getElementById("payableCategoryForm");
const payableCategoryNameField = document.getElementById("payableCategoryNameField");
const payableCategoryColorField = document.getElementById("payableCategoryColorField");
const payableCategoryFormError = document.getElementById("payableCategoryFormError");
const payableCategoryList = document.getElementById("payableCategoryList");
const payableCalendarMonthLabel = document.getElementById("payableCalendarMonthLabel");
const payableCalendarSelectionLabel = document.getElementById("payableCalendarSelectionLabel");
const payableCalendarPrevBtn = document.getElementById("payableCalendarPrevBtn");
const payableCalendarNextBtn = document.getElementById("payableCalendarNextBtn");
const payableCalendarTodayBtn = document.getElementById("payableCalendarTodayBtn");
const payableCalendarClearBtn = document.getElementById("payableCalendarClearBtn");
const payableCalendarGrid = document.getElementById("payableCalendarGrid");
const banksBody = document.getElementById("banksBody");
const summaryBankCount = document.getElementById("summaryBankCount");
const summaryBankInUse = document.getElementById("summaryBankInUse");
const summaryBankUnused = document.getElementById("summaryBankUnused");
const summaryBankPayables = document.getElementById("summaryBankPayables");
const banksSubtitle = document.getElementById("banksSubtitle");

const formModal = document.getElementById("formModal");
const deleteModal = document.getElementById("deleteModal");
const eventFormModal = document.getElementById("eventFormModal");
const eventDeleteModal = document.getElementById("eventDeleteModal");
const formTitle = document.getElementById("formModalTitle");
const transactionForm = document.getElementById("transactionForm");
const transactionIdField = document.getElementById("transactionId");
const titleField = document.getElementById("titleField");
const bankField = document.getElementById("bankField");
const typeField = document.getElementById("typeField");
const amountField = document.getElementById("amountField");
const dateField = document.getElementById("dateField");
const descriptionField = document.getElementById("descriptionField");
const formError = document.getElementById("formError");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const openCreateModalBtn = document.getElementById("openCreateModal");
const eventModalTitle = document.getElementById("eventModalTitle");
const eventForm = document.getElementById("eventForm");
const eventIdField = document.getElementById("eventIdField");
const eventTitleField = document.getElementById("eventTitleField");
const eventCreatorField = document.getElementById("eventCreatorField");
const eventStartsAtField = document.getElementById("eventStartsAtField");
const eventEndsAtField = document.getElementById("eventEndsAtField");
const eventImportanceField = document.getElementById("eventImportanceField");
const eventStatusField = document.getElementById("eventStatusField");
const eventColorField = document.getElementById("eventColorField");
const eventReminderField = document.getElementById("eventReminderField");
const eventLocationField = document.getElementById("eventLocationField");
const eventAllDayField = document.getElementById("eventAllDayField");
const eventDescriptionField = document.getElementById("eventDescriptionField");
const eventFormError = document.getElementById("eventFormError");
const eventDeleteFromFormBtn = document.getElementById("eventDeleteFromFormBtn");
const confirmEventDeleteBtn = document.getElementById("confirmEventDeleteBtn");

const payableFormModal = document.getElementById("payableFormModal");
const payableDeleteModal = document.getElementById("payableDeleteModal");
const installmentDetailsModal = document.getElementById("installmentDetailsModal");
const installmentDetailsModalCard = document.getElementById("installmentDetailsModalCard");
const installmentDetailsExpandBtn = document.getElementById("installmentDetailsExpandBtn");
const payableModalTitle = document.getElementById("payableModalTitle");
const payableForm = document.getElementById("payableForm");
const payableIdField = document.getElementById("payableId");
const payableTitleField = document.getElementById("payableTitleField");
const payableTypeField = document.getElementById("payableTypeField");
const payableCategoryField = document.getElementById("payableCategoryField");
const payableBankField = document.getElementById("payableBankField");
const payableStatusField = document.getElementById("payableStatusField");
const payableAmountField = document.getElementById("payableAmountField");
const payableAmountLabel = document.getElementById("payableAmountLabel");
const payableDueDateField = document.getElementById("payableDueDateField");
const payablePaymentDateField = document.getElementById("payablePaymentDateField");
const payablePaymentNoteField = document.getElementById("payablePaymentNoteField");
const payableInstallmentNumberField = document.getElementById("payableInstallmentNumberField");
const payableInstallmentTotalField = document.getElementById("payableInstallmentTotalField");
const payableRecurringField = document.getElementById("payableRecurringField");
const payableDescriptionField = document.getElementById("payableDescriptionField");
const installmentFields = document.getElementById("installmentFields");
const installmentAmountPreview = document.getElementById("installmentAmountPreview");
const recurringFieldRow = document.getElementById("recurringFieldRow");
const payableFormError = document.getElementById("payableFormError");
const openPayableModalBtn = document.getElementById("openPayableModal");
const confirmPayableDeleteBtn = document.getElementById("confirmPayableDeleteBtn");
const installmentDetailsTitle = document.getElementById("installmentDetailsTitle");
const installmentDetailsSummary = document.getElementById("installmentDetailsSummary");
const installmentDetailsBody = document.getElementById("installmentDetailsBody");
const installmentPaymentDateField = document.getElementById("installmentPaymentDate");
const installmentPaymentNoteField = document.getElementById("installmentPaymentNote");
const installmentBulkUntilSelect = document.getElementById("installmentBulkUntil");
const installmentPayUntilBtn = document.getElementById("installmentPayUntilBtn");
const installmentPayAllBtn = document.getElementById("installmentPayAllBtn");
const installmentReopenAllBtn = document.getElementById("installmentReopenAllBtn");
const installmentBulkError = document.getElementById("installmentBulkError");
const receiptPromptModal = document.getElementById("receiptPromptModal");
const receiptPromptMessage = document.getElementById("receiptPromptMessage");
const receiptPromptYesBtn = document.getElementById("receiptPromptYesBtn");
const receiptUploadModal = document.getElementById("receiptUploadModal");
const receiptUploadTitle = document.getElementById("receiptUploadTitle");
const receiptUploadMeta = document.getElementById("receiptUploadMeta");
const receiptUploadCurrent = document.getElementById("receiptUploadCurrent");
const receiptPreviewArea = document.getElementById("receiptPreviewArea");
const receiptFileField = document.getElementById("receiptFileField");
const receiptUploadSubmitBtn = document.getElementById("receiptUploadSubmitBtn");
const receiptDeleteBtn = document.getElementById("receiptDeleteBtn");
const receiptUploadError = document.getElementById("receiptUploadError");
const installmentHistoryModal = document.getElementById("installmentHistoryModal");
const installmentHistoryTitle = document.getElementById("installmentHistoryTitle");
const installmentHistoryMeta = document.getElementById("installmentHistoryMeta");
const installmentHistoryList = document.getElementById("installmentHistoryList");
const installmentHistoryError = document.getElementById("installmentHistoryError");
const bankFormModal = document.getElementById("bankFormModal");
const bankDeleteModal = document.getElementById("bankDeleteModal");
const bankForm = document.getElementById("bankForm");
const bankNameField = document.getElementById("bankNameField");
const bankColorField = document.getElementById("bankColorField");
const bankIconField = document.getElementById("bankIconField");
const bankFormError = document.getElementById("bankFormError");
const openBankModalBtn = document.getElementById("openBankModal");
const confirmBankDeleteBtn = document.getElementById("confirmBankDeleteBtn");
const bankDeleteError = document.getElementById("bankDeleteError");
const reportTypeFilterSelect = document.getElementById("reportTypeFilter");
const reportBankFilterSelect = document.getElementById("reportBankFilter");
const reportFormatFilterSelect = document.getElementById("reportFormatFilter");
const reportDetailLevelFilterSelect = document.getElementById("reportDetailLevelFilter");
const reportStartDateFilterInput = document.getElementById("reportStartDateFilter");
const reportEndDateFilterInput = document.getElementById("reportEndDateFilter");
const exportReportBtn = document.getElementById("exportReportBtn");
const reportExportError = document.getElementById("reportExportError");

const formatCurrency = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
const formatDate = (dateValue) => new Intl.DateTimeFormat("pt-BR").format(new Date(`${dateValue}T00:00:00`));
const formatDateTime = (dateTimeValue) =>
    new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(dateTimeValue));
const formatOptionalDate = (dateValue) => (dateValue ? formatDate(dateValue) : "-");
const escapeHtml = (value) =>
    String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
const normalizeText = (value) =>
    String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
const queryTokens = (query) => normalizeText(query).split(/\s+/).filter(Boolean);
const todayDate = new Date(`${initialData.today}T00:00:00`);
const reminderTriggerDays = new Set([0, 1, 3]);

const toIsoDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const addDays = (date, amount) => {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
};

const normalizeBankIcon = (iconValue) => {
    const raw = String(iconValue || "").trim().toLowerCase();
    if (!raw) {
        return "ph-bank";
    }
    const iconToken = raw.match(/ph-[a-z0-9-]+/);
    if (iconToken) {
        return iconToken[0];
    }
    const slug = raw.replace(/[^a-z0-9-]/g, "");
    return slug ? `ph-${slug}` : "ph-bank";
};

const dateStampFromIso = (isoDate) => {
    const [year, month, day] = String(isoDate).split("-").map(Number);
    return Date.UTC(year, month - 1, day);
};

const getIsoDateFromDateTime = (dateTimeValue) => {
    if (!dateTimeValue) {
        return "";
    }
    const date = new Date(dateTimeValue);
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    return toIsoDate(date);
};

const toDatetimeLocalInputValue = (isoDateTime) => {
    if (!isoDateTime) {
        return "";
    }
    const date = new Date(isoDateTime);
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
};

const toIsoDateTimeFromInput = (inputValue) => {
    if (!inputValue) {
        return "";
    }
    const parsed = new Date(inputValue);
    if (Number.isNaN(parsed.getTime())) {
        return "";
    }
    return parsed.toISOString();
};

const getDaysFromToday = (isoDate) => {
    const targetStamp = dateStampFromIso(isoDate);
    const todayStamp = dateStampFromIso(initialData.today);
    return Math.round((targetStamp - todayStamp) / 86400000);
};

const formatRelativeDueText = (daysFromToday) => {
    if (daysFromToday < 0) {
        const overdueDays = Math.abs(daysFromToday);
        return overdueDays === 1 ? "Vencida ha 1 dia" : `Vencida ha ${overdueDays} dias`;
    }
    if (daysFromToday === 0) {
        return "Vence hoje";
    }
    if (daysFromToday === 1) {
        return "Vence amanha";
    }
    return `Vence em ${daysFromToday} dias`;
};

const getCookie = (name) => {
    const cookies = document.cookie ? document.cookie.split(";") : [];
    for (const cookie of cookies) {
        const trimmed = cookie.trim();
        if (trimmed.startsWith(`${name}=`)) {
            return decodeURIComponent(trimmed.slice(name.length + 1));
        }
    }
    return null;
};

const getResourceUrl = (template, resourceId) => template.replace("/0/", `/${resourceId}/`);

const extractFilenameFromDisposition = (headerValue, fallbackFileName) => {
    if (!headerValue) {
        return fallbackFileName;
    }
    const utfMatch = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
    if (utfMatch && utfMatch[1]) {
        return decodeURIComponent(utfMatch[1]);
    }
    const regularMatch = headerValue.match(/filename=\"?([^\";]+)\"?/i);
    if (regularMatch && regularMatch[1]) {
        return regularMatch[1];
    }
    return fallbackFileName;
};

const collectFirstError = (errors) => {
    const firstField = Object.keys(errors)[0];
    if (!firstField || !Array.isArray(errors[firstField]) || !errors[firstField].length) {
        return "Nao foi possivel salvar. Verifique os campos.";
    }
    return errors[firstField][0];
};

const statusLabelMap = {
    pending: "Pendente",
    paid: "Pago",
};

const getReceiptFileExtension = (fileName) => {
    const lower = String(fileName || "").toLowerCase();
    const dotIndex = lower.lastIndexOf(".");
    return dotIndex >= 0 ? lower.slice(dotIndex) : "";
};

const renderReceiptPreview = (installment) => {
    if (!receiptPreviewArea) {
        return;
    }

    const receiptUrl = installment?.payment_receipt_url || "";
    const receiptName = installment?.payment_receipt_name || "Comprovante";
    if (!receiptUrl) {
        receiptPreviewArea.innerHTML = '<p class="receipt-preview-empty">Nenhum comprovante para visualizar.</p>';
        return;
    }

    const extension = getReceiptFileExtension(receiptName);
    if ([".png", ".jpg", ".jpeg", ".webp"].includes(extension)) {
        receiptPreviewArea.innerHTML = `<img src="${receiptUrl}" alt="${escapeHtml(receiptName)}" class="receipt-preview-image">`;
        return;
    }
    if (extension === ".pdf") {
        receiptPreviewArea.innerHTML = `<iframe src="${receiptUrl}#toolbar=0" class="receipt-preview-frame" title="${escapeHtml(receiptName)}"></iframe>`;
        return;
    }

    receiptPreviewArea.innerHTML = `
        <p class="receipt-preview-empty">Preview indisponivel para este formato.</p>
        <a href="${receiptUrl}" target="_blank" rel="noopener noreferrer" class="receipt-preview-link">Abrir comprovante</a>
    `;
};

const formatHistoryDateTime = (isoDateTime) => {
    const date = new Date(isoDateTime);
    if (Number.isNaN(date.getTime())) {
        return "-";
    }
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(date);
};

const triggerSuccessFeedback = (element) => {
    if (!element || !element.classList) {
        return;
    }
    element.classList.remove("action-success");
    // Force reflow so repeated actions re-trigger animation.
    // eslint-disable-next-line no-unused-expressions
    element.offsetWidth;
    element.classList.add("action-success");
    window.setTimeout(() => {
        element.classList.remove("action-success");
    }, 760);
};

const isSidebarDrawerViewport = () => window.innerWidth <= 1240;

const syncMobileSidebarUi = () => {
    const isMobile = isSidebarDrawerViewport();
    const isOpen = isMobile && mobileSidebarOpen;
    document.body.classList.toggle("mobile-sidebar-open", isOpen);

    if (mobileSidebarBtn) {
        mobileSidebarBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
        mobileSidebarBtn.title = isOpen ? "Fechar menu" : "Abrir menu";
    }

    if (sidebarBackdrop) {
        sidebarBackdrop.setAttribute("aria-hidden", isOpen ? "false" : "true");
        sidebarBackdrop.tabIndex = isOpen ? 0 : -1;
    }

    if (sidebarElement) {
        sidebarElement.setAttribute("aria-hidden", isMobile && !isOpen ? "true" : "false");
    }

    if (toggleSidebarBtn) {
        if (isMobile) {
            toggleSidebarBtn.setAttribute("aria-pressed", isOpen ? "true" : "false");
            toggleSidebarBtn.title = isOpen ? "Fechar menu" : "Abrir menu";
            return;
        }
        const isCollapsed = document.body.classList.contains("sidebar-collapsed");
        toggleSidebarBtn.setAttribute("aria-pressed", isCollapsed ? "true" : "false");
        toggleSidebarBtn.title = isCollapsed ? "Expandir menu" : "Recolher menu";
    }
};

const setMobileSidebarOpen = (open) => {
    mobileSidebarOpen = Boolean(open);
    if (mobileSidebarOpen) {
        closeUserDropdown();
    }
    syncMobileSidebarUi();
};

const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
};

const startSidebarAnimation = () => {
    if (sidebarAnimationTimeoutId) {
        window.clearTimeout(sidebarAnimationTimeoutId);
    }
    document.body.classList.add("sidebar-animating");
    sidebarAnimationTimeoutId = window.setTimeout(() => {
        document.body.classList.remove("sidebar-animating");
        sidebarAnimationTimeoutId = null;
    }, 220);
};

const setSidebarCollapsed = (collapsed, { animate = true } = {}) => {
    const shouldDisableSidebarControls = collapsed && !isSidebarDrawerViewport();
    if (animate) {
        startSidebarAnimation();
    }
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    if (userDropdownTrigger) {
        userDropdownTrigger.setAttribute("aria-disabled", shouldDisableSidebarControls ? "true" : "false");
        userDropdownTrigger.tabIndex = shouldDisableSidebarControls ? -1 : 0;
        if (shouldDisableSidebarControls) {
            userDropdownTrigger.blur();
        }
    }
    if (shouldDisableSidebarControls) {
        closeUserDropdown();
    }
    if (!toggleSidebarBtn) {
        return;
    }
    if (isSidebarDrawerViewport()) {
        syncMobileSidebarUi();
        return;
    }
    toggleSidebarBtn.setAttribute("aria-pressed", collapsed ? "true" : "false");
    toggleSidebarBtn.title = collapsed ? "Expandir menu" : "Recolher menu";
};

const initSidebarState = () => {
    const fromStorage = window.localStorage.getItem(sidebarCollapsedStorageKey);
    const isCollapsed = fromStorage === "1";
    setSidebarCollapsed(isCollapsed, { animate: false });
    syncMobileSidebarUi();
};

const toggleSidebarState = () => {
    if (isSidebarDrawerViewport()) {
        toggleMobileSidebar();
        return;
    }
    const nextCollapsed = !document.body.classList.contains("sidebar-collapsed");
    setSidebarCollapsed(nextCollapsed);
    if (nextCollapsed) {
        closeUserDropdown();
    }
    window.localStorage.setItem(sidebarCollapsedStorageKey, nextCollapsed ? "1" : "0");
};

const setThemeMode = (mode) => {
    const isDark = mode === "dark";
    document.body.classList.toggle("theme-dark", isDark);
    if (!themeToggleBtn) {
        return;
    }
    themeToggleBtn.setAttribute("aria-pressed", isDark ? "true" : "false");
    themeToggleBtn.title = isDark ? "Ativar modo claro" : "Ativar modo escuro";
    if (themeToggleIcon) {
        themeToggleIcon.className = isDark ? "ph ph-sun" : "ph ph-moon";
    }
    if (themeToggleLabel) {
        themeToggleLabel.textContent = isDark ? "Modo claro" : "Modo escuro";
    }
};

const initThemeMode = () => {
    const storedMode = window.localStorage.getItem(themeModeStorageKey);
    if (storedMode === "dark" || storedMode === "light") {
        setThemeMode(storedMode);
        return;
    }

    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setThemeMode(prefersDark ? "dark" : "light");
};

const toggleThemeMode = () => {
    const nextMode = document.body.classList.contains("theme-dark") ? "light" : "dark";
    setThemeMode(nextMode);
    window.localStorage.setItem(themeModeStorageKey, nextMode);
};

const closeUserDropdown = () => {
    if (!userDropdown || !userDropdownTrigger) {
        return;
    }
    userDropdown.classList.remove("is-open");
    userDropdownTrigger.setAttribute("aria-expanded", "false");
};

const toggleUserDropdown = () => {
    if (!userDropdown || !userDropdownTrigger) {
        return;
    }
    if (!isSidebarDrawerViewport() && document.body.classList.contains("sidebar-collapsed")) {
        closeUserDropdown();
        return;
    }
    const isOpen = userDropdown.classList.toggle("is-open");
    userDropdownTrigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
};

const getLayoutWidgetElements = (container) =>
    container ? Array.from(container.querySelectorAll(".dashboard-widget[data-widget-id]")) : [];

const normalizeLayoutWidgetOrder = (container, order) => {
    const widgetIds = getLayoutWidgetElements(container).map((widget) => widget.dataset.widgetId);
    const normalized = [];
    const source = Array.isArray(order) ? order : [];
    source.forEach((widgetId) => {
        if (widgetIds.includes(widgetId) && !normalized.includes(widgetId)) {
            normalized.push(widgetId);
        }
    });
    widgetIds.forEach((widgetId) => {
        if (!normalized.includes(widgetId)) {
            normalized.push(widgetId);
        }
    });
    return normalized;
};

const applyLayoutWidgetOrder = (container, order) => {
    if (!container) {
        return;
    }
    const normalized = normalizeLayoutWidgetOrder(container, order);
    const widgetMap = new Map(getLayoutWidgetElements(container).map((widget) => [widget.dataset.widgetId, widget]));
    normalized.forEach((widgetId) => {
        const widget = widgetMap.get(widgetId);
        if (widget) {
            container.appendChild(widget);
        }
    });
};

const getLayoutWidgetOrder = (container) => getLayoutWidgetElements(container).map((widget) => widget.dataset.widgetId);

const getInitialLayoutWidgetOrder = ({ storageKey, fallbackOrder = [] }) => {
    if (Array.isArray(fallbackOrder) && fallbackOrder.length) {
        return fallbackOrder;
    }
    try {
        const localValue = window.localStorage.getItem(storageKey);
        return localValue ? JSON.parse(localValue) : [];
    } catch (_error) {
        return [];
    }
};

const saveLayoutWidgetOrderToLocalStorage = (container, storageKey) => {
    if (!container) {
        return [];
    }
    const order = normalizeLayoutWidgetOrder(container, getLayoutWidgetOrder(container));
    window.localStorage.setItem(storageKey, JSON.stringify(order));
    return order;
};

const saveDashboardWidgetOrder = async () => {
    if (!bodyData.layoutSaveUrl || !dashboardLayoutContainer) {
        return;
    }
    const order = saveLayoutWidgetOrderToLocalStorage(dashboardLayoutContainer, dashboardLayoutStorageKey);
    initialData.dashboard_widget_order = order;

    try {
        const response = await fetch(bodyData.layoutSaveUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken"),
            },
            body: JSON.stringify({ order }),
        });
        if (!response.ok) {
            return;
        }
        const payload = await response.json();
        if (payload.ok && Array.isArray(payload.order)) {
            initialData.dashboard_widget_order = payload.order;
            window.localStorage.setItem(dashboardLayoutStorageKey, JSON.stringify(payload.order));
        }
    } catch (_error) {
        // noop
    }
};

const getWidgetDropTarget = (candidates, pointerY) => {
    let closest = null;
    let closestOffset = Number.NEGATIVE_INFINITY;
    candidates.forEach((candidate) => {
        const rect = candidate.getBoundingClientRect();
        const offset = pointerY - rect.top - rect.height / 2;
        if (offset < 0 && offset > closestOffset) {
            closestOffset = offset;
            closest = candidate;
        }
    });
    return closest;
};

const initWidgetLayoutDragDrop = ({ container, storageKey, initialOrder = [], onSave }) => {
    if (!container) {
        return;
    }

    const resolvedInitialOrder = getInitialLayoutWidgetOrder({ storageKey, fallbackOrder: initialOrder });
    if (resolvedInitialOrder.length) {
        applyLayoutWidgetOrder(container, resolvedInitialOrder);
    }

    let draggedWidgetId = null;
    let canDragWidgetId = null;
    let pendingDragPointerY = null;
    let dragOverFrameId = null;
    let dragCandidateWidgets = [];

    const resetDragRuntime = () => {
        draggedWidgetId = null;
        canDragWidgetId = null;
        pendingDragPointerY = null;
        dragCandidateWidgets = [];
        if (dragOverFrameId) {
            cancelAnimationFrame(dragOverFrameId);
            dragOverFrameId = null;
        }
        container.classList.remove("drag-active");
        getLayoutWidgetElements(container).forEach((widget) => widget.classList.remove("dragging"));
    };

    container.addEventListener("pointerdown", (event) => {
        const handle = event.target.closest(".widget-drag-handle");
        if (!handle) {
            canDragWidgetId = null;
            return;
        }
        const widget = handle.closest(".dashboard-widget[data-widget-id]");
        canDragWidgetId = widget?.dataset.widgetId || null;
    });

    window.addEventListener("pointerup", () => {
        canDragWidgetId = null;
    });

    container.addEventListener("dragstart", (event) => {
        const widget = event.target.closest(".dashboard-widget[data-widget-id]");
        if (!widget) {
            return;
        }
        if (widget.dataset.widgetId !== canDragWidgetId) {
            event.preventDefault();
            return;
        }

        draggedWidgetId = widget.dataset.widgetId;
        widget.classList.add("dragging");
        container.classList.add("drag-active");
        dragCandidateWidgets = getLayoutWidgetElements(container).filter((candidate) => candidate.dataset.widgetId !== draggedWidgetId);
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", draggedWidgetId);
            event.dataTransfer.dropEffect = "move";
        }
    });

    container.addEventListener("dragover", (event) => {
        event.preventDefault();
        const draggingWidget = container.querySelector(".dashboard-widget.dragging");
        if (!draggingWidget) {
            return;
        }

        pendingDragPointerY = event.clientY;
        if (dragOverFrameId) {
            return;
        }

        dragOverFrameId = window.requestAnimationFrame(() => {
            dragOverFrameId = null;
            if (pendingDragPointerY === null) {
                return;
            }
            const targetWidget = getWidgetDropTarget(dragCandidateWidgets, pendingDragPointerY);
            if (!targetWidget) {
                if (draggingWidget.nextElementSibling) {
                    container.appendChild(draggingWidget);
                }
                return;
            }
            if (targetWidget !== draggingWidget && targetWidget !== draggingWidget.nextElementSibling) {
                container.insertBefore(draggingWidget, targetWidget);
            }
        });
    });

    container.addEventListener("drop", (event) => {
        event.preventDefault();
        if (!draggedWidgetId) {
            return;
        }
        resetDragRuntime();
        if (typeof onSave === "function") {
            onSave();
            return;
        }
        saveLayoutWidgetOrderToLocalStorage(container, storageKey);
    });

    container.addEventListener("dragend", () => {
        resetDragRuntime();
    });
};

const initDashboardDragDrop = () => {
    initWidgetLayoutDragDrop({
        container: dashboardLayoutContainer,
        storageKey: dashboardLayoutStorageKey,
        initialOrder: initialData.dashboard_widget_order,
        onSave: saveDashboardWidgetOrder,
    });
};

const initAdditionalTabsDragDrop = () => {
    initWidgetLayoutDragDrop({
        container: calendarLayoutContainer,
        storageKey: calendarLayoutStorageKey,
    });
    initWidgetLayoutDragDrop({
        container: payablesLayoutContainer,
        storageKey: payablesLayoutStorageKey,
    });
    initWidgetLayoutDragDrop({
        container: banksLayoutContainer,
        storageKey: banksLayoutStorageKey,
    });
};

const openModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (!modal) {
        return;
    }
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
};

const setInstallmentDetailsModalExpanded = (expanded) => {
    if (!installmentDetailsModal || !installmentDetailsModalCard || !installmentDetailsExpandBtn) {
        return;
    }
    installmentDetailsModal.classList.toggle("modal-expanded", expanded);
    installmentDetailsModalCard.classList.toggle("is-expanded", expanded);
    installmentDetailsExpandBtn.classList.toggle("is-active", expanded);
    installmentDetailsExpandBtn.setAttribute("aria-pressed", expanded ? "true" : "false");
    installmentDetailsExpandBtn.setAttribute(
        "aria-label",
        expanded ? "Restaurar tamanho do modal" : "Expandir para tela cheia",
    );
    installmentDetailsExpandBtn.setAttribute(
        "title",
        expanded ? "Restaurar tamanho do modal" : "Expandir para tela cheia",
    );
    const icon = installmentDetailsExpandBtn.querySelector("i");
    if (icon) {
        icon.className = expanded ? "ph ph-corners-in" : "ph ph-corners-out";
    }
};

const toggleInstallmentDetailsModalExpanded = () => {
    if (!installmentDetailsModal) {
        return;
    }
    const isExpanded = installmentDetailsModal.classList.contains("modal-expanded");
    setInstallmentDetailsModalExpanded(!isExpanded);
};

const closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (!modal) {
        return;
    }
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    if (modalId === "eventFormModal") {
        eventDeleteCandidateId = null;
        if (eventFormError) {
            eventFormError.textContent = "";
        }
    }
    if (modalId === "eventDeleteModal") {
        eventDeleteCandidateId = null;
    }
    if (modalId === "installmentDetailsModal") {
        setInstallmentDetailsModalExpanded(false);
        activeInstallmentDetailsId = null;
        pendingReceiptPromptInstallmentId = null;
        receiptUploadInstallmentId = null;
        activeHistoryInstallmentId = null;
        if (installmentBulkError) {
            installmentBulkError.textContent = "";
        }
        closeModal("receiptPromptModal");
        closeModal("receiptUploadModal");
        closeModal("installmentHistoryModal");
    }
    if (modalId === "receiptPromptModal") {
        pendingReceiptPromptInstallmentId = null;
    }
    if (modalId === "receiptUploadModal") {
        receiptUploadInstallmentId = null;
        if (receiptUploadError) {
            receiptUploadError.textContent = "";
        }
        if (receiptFileField) {
            receiptFileField.value = "";
        }
        if (receiptPreviewArea) {
            receiptPreviewArea.innerHTML = '<p class="receipt-preview-empty">Nenhum comprovante para visualizar.</p>';
        }
    }
    if (modalId === "installmentHistoryModal") {
        activeHistoryInstallmentId = null;
        if (installmentHistoryError) {
            installmentHistoryError.textContent = "";
        }
        if (installmentHistoryList) {
            installmentHistoryList.innerHTML = "";
        }
    }
    if (modalId === "bankDeleteModal") {
        bankDeleteCandidateId = null;
        if (bankDeleteError) {
            bankDeleteError.textContent = "";
        }
    }
};

const setActiveTab = (tabName) => {
    activeTab = tabName;
    tabMenuItems.forEach((item) => {
        const isActive = item.dataset.tab === tabName;
        item.classList.toggle("active", isActive);
        item.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    tabContents.forEach((content) => {
        content.classList.toggle("active", content.dataset.tabContent === tabName);
    });
    if (isSidebarDrawerViewport()) {
        setMobileSidebarOpen(false);
    }
};

const matchSmartQuery = (query, searchableText) => {
    const tokens = queryTokens(query);
    if (!tokens.length) {
        return true;
    }
    const normalizedBlob = normalizeText(searchableText);
    return tokens.every((token) => normalizedBlob.includes(token));
};

const isDateInPeriod = (isoDate, period) => {
    if (!isoDate || period === "all") {
        return true;
    }

    const date = new Date(`${isoDate}T00:00:00`);
    const dateStamp = toIsoDate(date);
    const todayStamp = initialData.today;

    if (period === "today") {
        return dateStamp === todayStamp;
    }

    if (period === "last7") {
        const start = toIsoDate(addDays(todayDate, -6));
        return dateStamp >= start && dateStamp <= todayStamp;
    }

    if (period === "last30") {
        const start = toIsoDate(addDays(todayDate, -29));
        return dateStamp >= start && dateStamp <= todayStamp;
    }

    if (period === "this_month") {
        return date.getFullYear() === todayDate.getFullYear() && date.getMonth() === todayDate.getMonth();
    }

    if (period === "next7") {
        const end = toIsoDate(addDays(todayDate, 7));
        return dateStamp >= todayStamp && dateStamp <= end;
    }

    if (period === "overdue") {
        return dateStamp < todayStamp;
    }

    return true;
};

const hasActiveTransactionFilters = () =>
    activeBankFilter !== "all" ||
    transactionTypeFilter !== "all" ||
    transactionPeriodFilter !== "all" ||
    Boolean(queryTokens(transactionSearchQuery).length);

const hasActivePayableFilters = () =>
    payableStatusFilter !== "all" ||
    payableTypeFilter !== "all" ||
    payableCategoryFilter !== "all" ||
    payableBankFilter !== "all" ||
    payablePeriodFilter !== "all" ||
    Boolean(payableExactDateFilter) ||
    Boolean(queryTokens(payableSearchQuery).length);

const buildTransactionSearchBlob = (transaction) => {
    const amount = Number(transaction.amount);
    const transactionDate = new Date(`${transaction.transaction_date}T00:00:00`);
    const isIncome = transaction.transaction_type === "income";
    const typeAliases = isIncome
        ? "entrada entradas receita receitas ganho ganhos credito creditos income"
        : "saida saidas despesa despesas gasto gastos debito debitos expense";

    return [
        transaction.title,
        transaction.description,
        transaction.bank?.name,
        transaction.transaction_type,
        typeAliases,
        formatDate(transaction.transaction_date),
        transaction.transaction_date,
        monthLabels[transactionDate.getMonth()],
        String(transactionDate.getFullYear()),
        amount.toFixed(2),
        amount.toFixed(2).replace(".", ","),
        formatCurrency(amount),
    ].join(" ");
};

const buildPayableSearchBlob = (payable) => {
    const amount = Number(payable.amount);
    const statusInfo = getPayableStatusInfo(payable);
    const typeAliases = {
        invoice: "fatura cartao boleto invoice",
        subscription: "assinatura recorrente subscription mensalidade",
        debt: "divida emprestimo debt debito",
        installment: "parcela parcelado installment",
        other: "outro avulso other",
    };
    const statusAliases =
        payable.status === "paid"
            ? "pago paga quitado quitada"
            : isPayableOverdue(payable)
                ? "vencida vencido atrasada atrasado"
                : "pendente aberto em aberto";

    return [
        payable.title,
        payable.description,
        payable.bank?.name || "sem banco",
        payable.payable_type,
        payableTypeLabels[payable.payable_type],
        payable.category?.name || "",
        typeAliases[payable.payable_type] || "",
        payable.status,
        statusInfo.label,
        statusAliases,
        `${payable.installment_number || ""}/${payable.installment_total || ""}`,
        formatDate(payable.due_date),
        payable.due_date,
        payable.payment_date ? formatDate(payable.payment_date) : "",
        payable.payment_date || "",
        payable.payment_note || "",
        payable.payment_receipt_name || "",
        payable.payment_receipt_url ? "comprovante anexado" : "sem comprovante",
        amount.toFixed(2),
        amount.toFixed(2).replace(".", ","),
        formatCurrency(amount),
    ].join(" ");
};

const getFilteredTransactions = () => {
    return transactions.filter((transaction) => {
        if (activeBankFilter !== "all" && String(transaction.bank.id) !== activeBankFilter) {
            return false;
        }

        if (transactionTypeFilter !== "all" && transaction.transaction_type !== transactionTypeFilter) {
            return false;
        }

        if (!isDateInPeriod(transaction.transaction_date, transactionPeriodFilter)) {
            return false;
        }

        return matchSmartQuery(transactionSearchQuery, buildTransactionSearchBlob(transaction));
    });
};

const syncBankCollection = () => {
    banks = [...banks]
        .map((bank) => ({ ...bank, icon: normalizeBankIcon(bank.icon) }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
};

const syncPayableCategoryCollection = () => {
    payableCategories = [...payableCategories].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
};

const renderTransactionBankOptions = () => {
    if (!bankField) {
        return;
    }
    const currentValue = bankField.value;
    if (!banks.length) {
        bankField.innerHTML = '<option value="">Cadastre um banco</option>';
        bankField.disabled = true;
        return;
    }
    bankField.innerHTML = banks.map((bank) => `<option value="${bank.id}">${bank.name}</option>`).join("");
    bankField.disabled = false;
    bankField.value = banks.some((bank) => String(bank.id) === currentValue) ? currentValue : String(banks[0].id);
};

const renderPayableBankOptions = () => {
    if (!payableBankField) {
        return;
    }
    const currentValue = payableBankField.value;
    payableBankField.innerHTML = [
        '<option value="">Sem banco</option>',
        ...banks.map((bank) => `<option value="${bank.id}">${bank.name}</option>`),
    ].join("");
    payableBankField.value = banks.some((bank) => String(bank.id) === currentValue) ? currentValue : "";
};

const renderPayableBankFilterOptions = () => {
    if (!payableBankFilterSelect) {
        return;
    }
    const currentValue = payableBankFilterSelect.value || "all";
    payableBankFilterSelect.innerHTML = [
        '<option value="all">Todos</option>',
        '<option value="none">Sem banco</option>',
        ...banks.map((bank) => `<option value="${bank.id}">${bank.name}</option>`),
    ].join("");
    const isValidCurrent =
        currentValue === "all" ||
        currentValue === "none" ||
        banks.some((bank) => String(bank.id) === currentValue);
    payableBankFilterSelect.value = isValidCurrent ? currentValue : "all";
    payableBankFilter = payableBankFilterSelect.value;
};

const renderPayableCategoryOptions = () => {
    if (!payableCategoryField) {
        return;
    }
    const currentValue = payableCategoryField.value || "";
    payableCategoryField.innerHTML = [
        '<option value="">Sem categoria</option>',
        ...payableCategories.map((category) => `<option value="${category.id}">${category.name}</option>`),
    ].join("");
    payableCategoryField.value = payableCategories.some((category) => String(category.id) === currentValue)
        ? currentValue
        : "";
};

const renderPayableCategoryFilterOptions = () => {
    if (!payableCategoryFilterSelect) {
        return;
    }
    const currentValue = payableCategoryFilterSelect.value || "all";
    payableCategoryFilterSelect.innerHTML = [
        '<option value="all">Todas</option>',
        '<option value="none">Sem categoria</option>',
        ...payableCategories.map((category) => `<option value="${category.id}">${category.name}</option>`),
    ].join("");
    const isValidCurrent =
        currentValue === "all" ||
        currentValue === "none" ||
        payableCategories.some((category) => String(category.id) === currentValue);
    payableCategoryFilterSelect.value = isValidCurrent ? currentValue : "all";
    payableCategoryFilter = payableCategoryFilterSelect.value;
};

const renderReportBankOptions = () => {
    if (!reportBankFilterSelect) {
        return;
    }
    const currentValue = reportBankFilterSelect.value || "all";
    reportBankFilterSelect.innerHTML = [
        '<option value="all">Todos os bancos</option>',
        ...banks.map((bank) => `<option value="${bank.id}">${bank.name}</option>`),
    ].join("");
    const isValidCurrent = currentValue === "all" || banks.some((bank) => String(bank.id) === currentValue);
    reportBankFilterSelect.value = isValidCurrent ? currentValue : "all";
};

const buildBankFilter = () => {
    if (!bankFilterContainer) {
        return;
    }
    const buttons = [
        '<button class="filter-btn active" data-filter="all">Todos</button>',
        ...banks.map(
            (bank) =>
                `<button class="filter-btn" data-filter="${bank.id}"><i class="ph ${normalizeBankIcon(bank.icon)}"></i>${bank.name}</button>`
        ),
    ];
    bankFilterContainer.innerHTML = buttons.join("");
};

const syncFilterButtons = () => {
    if (!bankFilterContainer) {
        return;
    }
    const buttons = bankFilterContainer.querySelectorAll(".filter-btn");
    buttons.forEach((button) => {
        const isActive = button.dataset.filter === activeBankFilter;
        button.classList.toggle("active", isActive);
    });
};

const updateSummary = (filteredTransactions) => {
    const income = filteredTransactions
        .filter((transaction) => transaction.transaction_type === "income")
        .reduce((total, transaction) => total + Number(transaction.amount), 0);
    const expense = filteredTransactions
        .filter((transaction) => transaction.transaction_type === "expense")
        .reduce((total, transaction) => total + Number(transaction.amount), 0);
    const balance = income - expense;

    summaryBalance.textContent = formatCurrency(balance);
    summaryIncome.textContent = formatCurrency(income);
    summaryExpense.textContent = formatCurrency(expense);
    summaryCount.textContent = String(filteredTransactions.length);

    if (!hasActiveTransactionFilters()) {
        transactionsSubtitle.textContent = "Visualizando todas";
        return;
    }

    const parts = [];
    if (activeBankFilter !== "all") {
        const selectedBank = banks.find((bank) => String(bank.id) === activeBankFilter);
        if (selectedBank) {
            parts.push(selectedBank.name);
        }
    }
    if (transactionTypeFilter !== "all") {
        parts.push(transactionTypeFilter === "income" ? "Entradas" : "Saidas");
    }
    if (transactionPeriodFilter !== "all") {
        const periodLabels = {
            today: "Hoje",
            last7: "Ultimos 7 dias",
            last30: "Ultimos 30 dias",
            this_month: "Mes atual",
        };
        parts.push(periodLabels[transactionPeriodFilter] || "Periodo");
    }
    if (queryTokens(transactionSearchQuery).length) {
        parts.push(`Busca: "${transactionSearchQuery.trim()}"`);
    }
    transactionsSubtitle.textContent = `Exibindo ${filteredTransactions.length} de ${transactions.length} | ${parts.join(" | ")}`;
};

const getMonthKey = (dateValue) => {
    const date = new Date(`${dateValue}T00:00:00`);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const buildChartSeries = (filteredTransactions) => {
    const months = [];
    const now = new Date();

    for (let offset = 5; offset >= 0; offset -= 1) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
        months.push({ key, label: monthLabels[monthDate.getMonth()] });
    }

    const map = {};
    months.forEach((month) => {
        map[month.key] = { income: 0, expense: 0 };
    });

    filteredTransactions.forEach((transaction) => {
        const key = getMonthKey(transaction.transaction_date);
        if (!map[key]) {
            return;
        }
        const amount = Number(transaction.amount);
        if (transaction.transaction_type === "income") {
            map[key].income += amount;
        } else {
            map[key].expense += amount;
        }
    });

    return {
        categories: months.map((month) => month.label),
        incomeData: months.map((month) => Number(map[month.key].income.toFixed(2))),
        expenseData: months.map((month) => Number(map[month.key].expense.toFixed(2))),
    };
};

const initChart = () => {
    const chartElement = document.querySelector("#balanceChart");
    if (!chartElement) {
        return;
    }

    const options = {
        chart: {
            type: "area",
            height: 280,
            toolbar: { show: false },
            foreColor: "#9EA8BC",
            animations: { enabled: true, easing: "easeinout", speed: 450 },
        },
        stroke: { curve: "smooth", width: 2.8 },
        dataLabels: { enabled: false },
        colors: ["#38D39F", "#FF5B73"],
        grid: { borderColor: "rgba(255,255,255,0.08)", strokeDashArray: 3 },
        fill: {
            type: "gradient",
            gradient: { shadeIntensity: 1, opacityFrom: 0.22, opacityTo: 0.03, stops: [0, 100] },
        },
        legend: { position: "top", horizontalAlign: "right" },
        tooltip: {
            theme: "dark",
            y: { formatter: (value) => formatCurrency(value) },
        },
        series: [
            { name: "Entradas", data: [] },
            { name: "Saidas", data: [] },
        ],
        xaxis: { categories: [] },
        yaxis: {
            labels: { formatter: (value) => formatCurrency(value) },
        },
    };

    chart = new ApexCharts(chartElement, options);
    chart.render();
};

const updateChart = (filteredTransactions) => {
    if (!chart) {
        return;
    }
    const series = buildChartSeries(filteredTransactions);
    chart.updateOptions({ xaxis: { categories: series.categories } });
    chart.updateSeries([
        { name: "Entradas", data: series.incomeData },
        { name: "Saidas", data: series.expenseData },
    ]);
};

const renderTransactionsTable = (filteredTransactions) => {
    if (!transactionsBody) {
        return;
    }

    if (!filteredTransactions.length) {
        transactionsBody.innerHTML = '<tr><td class="empty" colspan="6">Nenhuma transacao encontrada.</td></tr>';
        return;
    }

    const sorted = [...filteredTransactions].sort((a, b) => {
        if (a.transaction_date === b.transaction_date) {
            return b.id - a.id;
        }
        return a.transaction_date < b.transaction_date ? 1 : -1;
    });

    transactionsBody.innerHTML = sorted
        .map((transaction) => {
            const isIncome = transaction.transaction_type === "income";
            const signal = isIncome ? "+" : "-";
            const typeLabel = isIncome ? "Entrada" : "Saida";
            const typeClass = isIncome ? "type-income" : "type-expense";
            const amountClass = isIncome ? "amount-income" : "amount-expense";
            return `
                <tr>
                    <td class="tabular-num">${formatDate(transaction.transaction_date)}</td>
                    <td>${transaction.title}</td>
                    <td>
                        <span class="bank-tag">
                            <i class="ph ${normalizeBankIcon(transaction.bank.icon)} bank-icon-inline"></i>
                            <span class="bank-dot" style="background:${transaction.bank.color};"></span>
                            ${transaction.bank.name}
                        </span>
                    </td>
                    <td><span class="type-pill ${typeClass}">${typeLabel}</span></td>
                    <td class="${amountClass} tabular-num">${signal}${formatCurrency(transaction.amount)}</td>
                    <td>
                        <div class="actions">
                            <button class="action-btn" title="Editar" data-action="edit" data-id="${transaction.id}">
                                <i class="ph ph-pencil-simple"></i>
                            </button>
                            <button class="action-btn" title="Remover" data-action="delete" data-id="${transaction.id}">
                                <i class="ph ph-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        })
        .join("");
};

const refreshDashboard = () => {
    const filteredTransactions = getFilteredTransactions();
    syncFilterButtons();
    updateSummary(filteredTransactions);
    updateChart(filteredTransactions);
    renderTransactionsTable(filteredTransactions);
    updateDashboardReminders();
    refreshBanksTab();
};

const getEventById = (eventId) => events.find((item) => item.id === eventId) || null;

const getEventSearchBlob = (eventItem) =>
    [
        eventItem.title,
        eventItem.creator_name,
        eventItem.description,
        eventItem.location,
        eventItem.status,
        eventStatusLabels[eventItem.status] || eventItem.status,
        eventItem.importance,
        eventImportanceLabels[eventItem.importance] || eventItem.importance,
        formatDateTime(eventItem.starts_at),
        eventItem.starts_at,
        eventItem.ends_at ? formatDateTime(eventItem.ends_at) : "",
        eventItem.ends_at || "",
    ].join(" ");

const getFilteredEvents = () => {
    return [...events]
        .filter((eventItem) => {
            if (eventStatusFilter !== "all" && eventItem.status !== eventStatusFilter) {
                return false;
            }
            if (eventImportanceFilter !== "all" && eventItem.importance !== eventImportanceFilter) {
                return false;
            }
            return matchSmartQuery(eventSearchQuery, getEventSearchBlob(eventItem));
        })
        .sort((a, b) => {
            if (a.starts_at === b.starts_at) {
                return a.id - b.id;
            }
            return a.starts_at > b.starts_at ? 1 : -1;
        });
};

const getEventStatusClass = (status) => {
    if (status === "completed") {
        return "event-status-completed";
    }
    if (status === "canceled") {
        return "event-status-canceled";
    }
    return "event-status-pending";
};

const getEventImportanceClass = (importance) => {
    if (importance === "critical") {
        return "event-importance-critical";
    }
    if (importance === "high") {
        return "event-importance-high";
    }
    if (importance === "low") {
        return "event-importance-low";
    }
    return "event-importance-medium";
};

const updateEventSummary = (filteredEvents) => {
    if (!summaryEventTotal || !summaryEventPending || !summaryEventCompleted || !summaryEventCritical) {
        return;
    }
    const pendingCount = filteredEvents.filter((item) => item.status === "pending").length;
    const completedCount = filteredEvents.filter((item) => item.status === "completed").length;
    const criticalCount = filteredEvents.filter((item) => item.importance === "critical").length;
    summaryEventTotal.textContent = String(filteredEvents.length);
    summaryEventPending.textContent = String(pendingCount);
    summaryEventCompleted.textContent = String(completedCount);
    summaryEventCritical.textContent = String(criticalCount);
};

const getEventLocalDateToken = (eventItem) => getIsoDateFromDateTime(eventItem.starts_at);

const formatEventCurrentPeriod = () => {
    if (!eventCurrentPeriod) {
        return;
    }
    if (eventViewMode === "agenda") {
        eventCurrentPeriod.textContent = "Agenda completa";
        return;
    }
    if (eventViewMode === "week") {
        const weekStart = new Date(eventCursorDate);
        const day = weekStart.getDay();
        weekStart.setDate(weekStart.getDate() - day);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        eventCurrentPeriod.textContent = `${new Intl.DateTimeFormat("pt-BR").format(weekStart)} - ${new Intl.DateTimeFormat("pt-BR").format(weekEnd)}`;
        return;
    }
    eventCurrentPeriod.textContent = new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
    }).format(eventCursorDate);
};

const buildEventUpdateFormData = (payload) => {
    const formData = new FormData();
    const normalizeDateTime = (value) => {
        if (!value) {
            return "";
        }
        if (typeof value === "string" && value.length <= 16 && value.includes("T")) {
            return value;
        }
        return toDatetimeLocalInputValue(value);
    };

    formData.set("title", payload.title || "");
    formData.set("creator_name", payload.creator_name || "");
    formData.set("starts_at", normalizeDateTime(payload.starts_at));
    formData.set("ends_at", payload.ends_at ? normalizeDateTime(payload.ends_at) : "");
    formData.set("description", payload.description || "");
    formData.set("location", payload.location || "");
    formData.set("color", payload.color || "#4F46E5");
    formData.set("status", payload.status || "pending");
    formData.set("importance", payload.importance || "medium");
    formData.set("reminder_minutes_before", String(payload.reminder_minutes_before ?? 60));
    if (payload.all_day) {
        formData.set("all_day", "on");
    }
    return formData;
};

const updateEventInState = (updatedEvent) => {
    const updatedId = Number(updatedEvent.id);
    const hasEvent = events.some((item) => item.id === updatedId);
    if (hasEvent) {
        events = events.map((item) => (item.id === updatedId ? updatedEvent : item));
    } else {
        events.unshift(updatedEvent);
    }
};

const submitEventUpdatePayload = async (eventId, payload) => {
    const endpoint = getResourceUrl(bodyData.eventUpdateUrlTemplate, eventId);
    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "X-CSRFToken": getCookie("csrftoken") },
        body: buildEventUpdateFormData(payload),
    });
    const responsePayload = await response.json();
    if (!response.ok || !responsePayload.ok) {
        throw new Error(collectFirstError(responsePayload.errors || {}));
    }
    return responsePayload.event;
};

const submitEventMoveToDate = async (eventId, targetDateIso) => {
    const eventItem = getEventById(eventId);
    if (!eventItem) {
        return;
    }
    const startsDate = new Date(eventItem.starts_at);
    if (Number.isNaN(startsDate.getTime())) {
        return;
    }
    const [year, month, day] = targetDateIso.split("-").map(Number);
    const movedStart = new Date(startsDate);
    movedStart.setFullYear(year, month - 1, day);

    let movedEnd = null;
    if (eventItem.ends_at) {
        const endsDate = new Date(eventItem.ends_at);
        if (!Number.isNaN(endsDate.getTime())) {
            const durationMs = endsDate.getTime() - startsDate.getTime();
            movedEnd = new Date(movedStart.getTime() + Math.max(durationMs, 0));
        }
    }

    try {
        const updatedEvent = await submitEventUpdatePayload(eventId, {
            ...eventItem,
            starts_at: movedStart.toISOString(),
            ends_at: movedEnd ? movedEnd.toISOString() : "",
        });
        updateEventInState(updatedEvent);
        refreshEvents();
    } catch (_error) {
        // noop
    }
};

const createEventPill = (eventItem) => {
    const pill = document.createElement("div");
    pill.className = `event-pill-small ${getEventStatusClass(eventItem.status)} ${getEventImportanceClass(eventItem.importance)}`;
    pill.setAttribute("draggable", "true");
    pill.dataset.eventAction = "edit";
    pill.dataset.id = String(eventItem.id);
    pill.innerHTML = `
        <span class="event-pill-time">${eventItem.all_day ? "Dia inteiro" : formatDateTime(eventItem.starts_at).split(" ")[1] || ""}</span>
        <span class="event-pill-title">${escapeHtml(eventItem.title)}</span>
    `;
    pill.style.borderLeftColor = eventItem.color || "#4F46E5";
    pill.addEventListener("click", (event) => {
        event.stopPropagation();
        openEventEditModal(eventItem.id);
    });
    pill.addEventListener("dragstart", (event) => {
        draggedEventId = eventItem.id;
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", String(eventItem.id));
        }
        pill.classList.add("dragging");
    });
    pill.addEventListener("dragend", () => {
        draggedEventId = null;
        pill.classList.remove("dragging");
    });
    return pill;
};

const createEventDayCell = (dateValue, dayNumber, options = {}) => {
    const { isOutside = false, dayEvents = [] } = options;
    const cell = document.createElement("div");
    cell.className = `event-day-cell${isOutside ? " is-outside" : ""}`;
    cell.dataset.date = dateValue;
    cell.innerHTML = `
        <span class="event-day-number">${dayNumber}</span>
        <div class="event-day-events"></div>
    `;

    const eventsContainer = cell.querySelector(".event-day-events");
    dayEvents.slice(0, 4).forEach((eventItem) => {
        eventsContainer.appendChild(createEventPill(eventItem));
    });
    if (dayEvents.length > 4) {
        const extra = document.createElement("span");
        extra.className = "event-day-more";
        extra.textContent = `+${dayEvents.length - 4} mais`;
        eventsContainer.appendChild(extra);
    }

    if (!isOutside) {
        cell.addEventListener("click", () => {
            openEventCreateModal(dateValue);
        });
        cell.addEventListener("dragover", (event) => {
            event.preventDefault();
            cell.classList.add("is-drag-over");
        });
        cell.addEventListener("dragleave", () => {
            cell.classList.remove("is-drag-over");
        });
        cell.addEventListener("drop", (event) => {
            event.preventDefault();
            cell.classList.remove("is-drag-over");
            const droppedId = draggedEventId || Number(event.dataTransfer?.getData("text/plain") || 0);
            if (!Number.isFinite(droppedId) || droppedId <= 0) {
                return;
            }
            submitEventMoveToDate(Number(droppedId), dateValue);
        });
    }
    return cell;
};

const renderEventMonthView = (filteredEvents) => {
    if (!eventViewContainer) {
        return;
    }
    const year = eventCursorDate.getFullYear();
    const month = eventCursorDate.getMonth();
    const firstDayWeekIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPreviousMonth = new Date(year, month, 0).getDate();

    const eventsByDay = new Map();
    filteredEvents.forEach((eventItem) => {
        const dateToken = getEventLocalDateToken(eventItem);
        if (!dateToken) {
            return;
        }
        if (!eventsByDay.has(dateToken)) {
            eventsByDay.set(dateToken, []);
        }
        eventsByDay.get(dateToken).push(eventItem);
    });

    const grid = document.createElement("div");
    grid.className = "event-month-grid";
    ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].forEach((weekDay) => {
        const header = document.createElement("div");
        header.className = "event-weekday";
        header.textContent = weekDay;
        grid.appendChild(header);
    });

    for (let offset = firstDayWeekIndex; offset > 0; offset -= 1) {
        const day = daysInPreviousMonth - offset + 1;
        const dateValue = toIsoDate(new Date(year, month - 1, day));
        grid.appendChild(createEventDayCell(dateValue, day, { isOutside: true, dayEvents: [] }));
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        const dateValue = toIsoDate(new Date(year, month, day));
        grid.appendChild(createEventDayCell(dateValue, day, { dayEvents: eventsByDay.get(dateValue) || [] }));
    }

    const totalCellsWithoutHeaders = firstDayWeekIndex + daysInMonth;
    const trailingCells = (7 - (totalCellsWithoutHeaders % 7)) % 7;
    for (let day = 1; day <= trailingCells; day += 1) {
        const dateValue = toIsoDate(new Date(year, month + 1, day));
        grid.appendChild(createEventDayCell(dateValue, day, { isOutside: true, dayEvents: [] }));
    }

    eventViewContainer.innerHTML = "";
    eventViewContainer.appendChild(grid);
};

const renderEventWeekView = (filteredEvents) => {
    if (!eventViewContainer) {
        return;
    }
    const start = new Date(eventCursorDate);
    const dayIndex = start.getDay();
    start.setDate(start.getDate() - dayIndex);
    start.setHours(0, 0, 0, 0);

    const eventsByDay = new Map();
    filteredEvents.forEach((eventItem) => {
        const dateToken = getEventLocalDateToken(eventItem);
        if (!dateToken) {
            return;
        }
        if (!eventsByDay.has(dateToken)) {
            eventsByDay.set(dateToken, []);
        }
        eventsByDay.get(dateToken).push(eventItem);
    });

    const grid = document.createElement("div");
    grid.className = "event-week-grid";
    for (let offset = 0; offset < 7; offset += 1) {
        const dayDate = new Date(start);
        dayDate.setDate(start.getDate() + offset);
        const dateToken = toIsoDate(dayDate);
        const column = document.createElement("div");
        column.className = "event-week-column";
        column.innerHTML = `
            <div class="event-week-column-head">${new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }).format(dayDate)}</div>
        `;
        const dayCell = createEventDayCell(dateToken, dayDate.getDate(), {
            dayEvents: eventsByDay.get(dateToken) || [],
        });
        dayCell.classList.add("event-week-day-cell");
        column.appendChild(dayCell);
        grid.appendChild(column);
    }

    eventViewContainer.innerHTML = "";
    eventViewContainer.appendChild(grid);
};

const renderEventAgendaView = (filteredEvents) => {
    if (!eventViewContainer) {
        return;
    }
    if (!filteredEvents.length) {
        eventViewContainer.innerHTML = '<div class="event-agenda-empty">Nenhum evento encontrado para os filtros atuais.</div>';
        return;
    }

    const grouped = new Map();
    filteredEvents.forEach((eventItem) => {
        const dayToken = getEventLocalDateToken(eventItem);
        if (!grouped.has(dayToken)) {
            grouped.set(dayToken, []);
        }
        grouped.get(dayToken).push(eventItem);
    });

    const blocks = [];
    grouped.forEach((items, dateToken) => {
        const itemsHtml = items
            .map((eventItem) => {
                const statusLabel = eventStatusLabels[eventItem.status] || eventItem.status;
                const importanceLabel = eventImportanceLabels[eventItem.importance] || eventItem.importance;
                return `
                    <article class="event-agenda-item" data-event-action="edit" data-id="${eventItem.id}">
                        <div class="event-agenda-main">
                            <p class="event-agenda-title">${escapeHtml(eventItem.title)}</p>
                            <p class="event-agenda-meta">${eventItem.all_day ? "Dia inteiro" : formatDateTime(eventItem.starts_at)}${eventItem.ends_at ? ` - ${formatDateTime(eventItem.ends_at)}` : ""}</p>
                            <p class="event-agenda-meta">${escapeHtml(eventItem.location || "Sem local")} | ${escapeHtml(eventItem.creator_name || "-")}</p>
                        </div>
                        <div class="event-agenda-tags">
                            <span class="event-tag ${getEventStatusClass(eventItem.status)}">${statusLabel}</span>
                            <span class="event-tag ${getEventImportanceClass(eventItem.importance)}">${importanceLabel}</span>
                        </div>
                    </article>
                `;
            })
            .join("");

        blocks.push(`
            <section class="event-agenda-group">
                <h5>${formatDate(dateToken)}</h5>
                ${itemsHtml}
            </section>
        `);
    });

    eventViewContainer.innerHTML = `<div class="event-agenda-list">${blocks.join("")}</div>`;
};

const renderEventCalendar = (filteredEvents) => {
    formatEventCurrentPeriod();
    if (!eventViewContainer) {
        return;
    }
    if (eventViewMode === "agenda") {
        renderEventAgendaView(filteredEvents);
        return;
    }
    if (eventViewMode === "week") {
        renderEventWeekView(filteredEvents);
        return;
    }
    renderEventMonthView(filteredEvents);
};

const renderEventReminders = (filteredEvents) => {
    if (!eventReminderSubtitle || !eventReminderList) {
        return;
    }
    const now = new Date();
    const upcoming = filteredEvents
        .filter((eventItem) => eventItem.status === "pending")
        .map((eventItem) => {
            const startsAt = new Date(eventItem.starts_at);
            const reminderAt = new Date(startsAt.getTime() - Number(eventItem.reminder_minutes_before || 0) * 60000);
            return {
                ...eventItem,
                startsAt,
                reminderAt,
                diffMinutes: Math.round((startsAt.getTime() - now.getTime()) / 60000),
            };
        })
        .filter((eventItem) => {
            const startsDiff = eventItem.startsAt.getTime() - now.getTime();
            return startsDiff >= -12 * 60 * 60000 && startsDiff <= 72 * 60 * 60000;
        })
        .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

    if (!upcoming.length) {
        eventReminderSubtitle.textContent = "Sem alertas no momento";
        eventReminderList.innerHTML =
            '<li class="reminder-empty">Sem lembretes proximos para os filtros atuais.</li>';
        return;
    }

    const dueNowCount = upcoming.filter((item) => now >= item.reminderAt && item.diffMinutes >= 0).length;
    eventReminderSubtitle.textContent = `${upcoming.length} proximos | ${dueNowCount} com lembrete ativo`;
    eventReminderList.innerHTML = upcoming
        .slice(0, 8)
        .map((eventItem) => {
            let relative = "";
            if (eventItem.diffMinutes < 0) {
                relative = `Atrasado ha ${Math.abs(eventItem.diffMinutes)} min`;
            } else if (eventItem.diffMinutes === 0) {
                relative = "Inicia agora";
            } else if (eventItem.diffMinutes < 60) {
                relative = `Inicia em ${eventItem.diffMinutes} min`;
            } else {
                relative = `Inicia em ${Math.round(eventItem.diffMinutes / 60)} h`;
            }
            return `
                <li class="reminder-item">
                    <div class="reminder-main">
                        <p class="reminder-title">${escapeHtml(eventItem.title)} (${eventImportanceLabels[eventItem.importance] || eventItem.importance})</p>
                        <p class="reminder-meta">${relative} | ${formatDateTime(eventItem.starts_at)} | lembrete ${eventItem.reminder_minutes_before} min antes</p>
                    </div>
                    <button type="button" class="receipt-view-btn history-view-btn" data-event-action="edit" data-id="${eventItem.id}">
                        <i class="ph ph-pencil-simple"></i> Editar
                    </button>
                </li>
            `;
        })
        .join("");
};

const refreshEvents = () => {
    const filteredEvents = getFilteredEvents();
    updateEventSummary(filteredEvents);
    renderEventCalendar(filteredEvents);
    renderEventReminders(filteredEvents);
};

const resetEventForm = () => {
    if (!eventForm) {
        return;
    }
    eventForm.reset();
    if (eventModalTitle) {
        eventModalTitle.textContent = "Novo evento";
    }
    if (eventIdField) {
        eventIdField.value = "";
    }
    if (eventStartsAtField) {
        const now = new Date();
        eventStartsAtField.value = toDatetimeLocalInputValue(now.toISOString());
    }
    if (eventColorField) {
        eventColorField.value = "#4F46E5";
    }
    if (eventReminderField) {
        eventReminderField.value = "60";
    }
    if (eventImportanceField) {
        eventImportanceField.value = "medium";
    }
    if (eventStatusField) {
        eventStatusField.value = "pending";
    }
    if (eventDeleteFromFormBtn) {
        eventDeleteFromFormBtn.classList.add("is-hidden");
    }
    if (eventFormError) {
        eventFormError.textContent = "";
    }
};

const openEventCreateModal = (dateIso = "") => {
    resetEventForm();
    if (dateIso && eventStartsAtField) {
        const now = new Date();
        const hour = String(now.getHours()).padStart(2, "0");
        const minute = String(now.getMinutes()).padStart(2, "0");
        eventStartsAtField.value = `${dateIso}T${hour}:${minute}`;
    }
    openModal("eventFormModal");
};

const openEventEditModal = (eventId) => {
    const eventItem = getEventById(eventId);
    if (!eventItem) {
        return;
    }
    resetEventForm();
    if (eventModalTitle) {
        eventModalTitle.textContent = "Editar evento";
    }
    if (eventIdField) {
        eventIdField.value = String(eventItem.id);
    }
    if (eventTitleField) {
        eventTitleField.value = eventItem.title;
    }
    if (eventCreatorField) {
        eventCreatorField.value = eventItem.creator_name || "";
    }
    if (eventStartsAtField) {
        eventStartsAtField.value = toDatetimeLocalInputValue(eventItem.starts_at);
    }
    if (eventEndsAtField) {
        eventEndsAtField.value = eventItem.ends_at ? toDatetimeLocalInputValue(eventItem.ends_at) : "";
    }
    if (eventImportanceField) {
        eventImportanceField.value = eventItem.importance || "medium";
    }
    if (eventStatusField) {
        eventStatusField.value = eventItem.status || "pending";
    }
    if (eventColorField) {
        eventColorField.value = eventItem.color || "#4F46E5";
    }
    if (eventReminderField) {
        eventReminderField.value = String(eventItem.reminder_minutes_before ?? 60);
    }
    if (eventLocationField) {
        eventLocationField.value = eventItem.location || "";
    }
    if (eventAllDayField) {
        eventAllDayField.checked = Boolean(eventItem.all_day);
    }
    if (eventDescriptionField) {
        eventDescriptionField.value = eventItem.description || "";
    }
    if (eventDeleteFromFormBtn) {
        eventDeleteFromFormBtn.classList.remove("is-hidden");
    }
    openModal("eventFormModal");
};

const submitEvent = async (event) => {
    event.preventDefault();
    if (!eventForm || !bodyData.eventCreateUrl) {
        return;
    }
    if (eventFormError) {
        eventFormError.textContent = "";
    }

    const currentEventId = eventIdField?.value || "";
    const isEdit = Boolean(currentEventId);
    const endpoint = isEdit ? getResourceUrl(bodyData.eventUpdateUrlTemplate, currentEventId) : bodyData.eventCreateUrl;
    const formData = new FormData(eventForm);

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "X-CSRFToken": getCookie("csrftoken") },
            body: formData,
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok) {
            if (eventFormError) {
                eventFormError.textContent = collectFirstError(payload.errors || {});
            }
            return;
        }
        updateEventInState(payload.event);
        closeModal("eventFormModal");
        refreshEvents();
    } catch (_error) {
        if (eventFormError) {
            eventFormError.textContent = "Erro de conexao. Tente novamente.";
        }
    }
};

const submitEventDelete = async () => {
    if (!eventDeleteCandidateId || !bodyData.eventDeleteUrlTemplate) {
        return;
    }
    const endpoint = getResourceUrl(bodyData.eventDeleteUrlTemplate, eventDeleteCandidateId);
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "X-CSRFToken": getCookie("csrftoken") },
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok) {
            return;
        }
        events = events.filter((item) => item.id !== payload.deleted_id);
        eventDeleteCandidateId = null;
        closeModal("eventDeleteModal");
        closeModal("eventFormModal");
        refreshEvents();
    } catch (_error) {
        // noop
    }
};

const clearEventFilters = () => {
    eventSearchQuery = "";
    eventStatusFilter = "all";
    eventImportanceFilter = "all";
    eventViewMode = "month";
    eventCursorDate = new Date(`${initialData.today}T00:00:00`);
    if (eventSearchInput) {
        eventSearchInput.value = "";
    }
    if (eventStatusFilterSelect) {
        eventStatusFilterSelect.value = "all";
    }
    if (eventImportanceFilterSelect) {
        eventImportanceFilterSelect.value = "all";
    }
    if (eventViewFilterSelect) {
        eventViewFilterSelect.value = "month";
    }
    refreshEvents();
};

const loadEventsFromApi = async () => {
    if (!bodyData.eventListUrl) {
        return;
    }
    try {
        const response = await fetch(bodyData.eventListUrl, { method: "GET" });
        const payload = await response.json();
        if (!response.ok || !payload.ok) {
            return;
        }
        events = Array.isArray(payload.events) ? payload.events : [];
        refreshEvents();
    } catch (_error) {
        // noop
    }
};

const isPayableOverdue = (payable) => payable.status === "pending" && payable.due_date < initialData.today;

const getReminderStatusClass = (daysFromToday) => {
    if (daysFromToday < 0) {
        return "reminder-overdue";
    }
    if (daysFromToday === 0) {
        return "reminder-today";
    }
    if (daysFromToday === 1) {
        return "reminder-tomorrow";
    }
    if (daysFromToday === 3) {
        return "reminder-three-days";
    }
    return "reminder-upcoming";
};

const getReminderPriority = (daysFromToday) => {
    if (daysFromToday < 0) {
        return 0;
    }
    if (daysFromToday === 0) {
        return 1;
    }
    if (daysFromToday === 1) {
        return 2;
    }
    if (daysFromToday === 3) {
        return 3;
    }
    return 4;
};

const updateDashboardReminders = () => {
    if (!dashboardRemindersList || !dashboardRemindersSubtitle) {
        return;
    }

    const pendingPayables = payables
        .filter((payable) => payable.status === "pending")
        .map((payable) => ({
            ...payable,
            daysFromToday: getDaysFromToday(payable.due_date),
        }));

    if (!pendingPayables.length) {
        dashboardRemindersSubtitle.textContent = "Nenhuma conta pendente";
        dashboardRemindersList.innerHTML = '<li class="reminder-empty">Tudo certo. Nao ha lembretes pendentes.</li>';
        return;
    }

    const reminderPayables = pendingPayables.filter(
        (payable) => payable.daysFromToday < 0 || reminderTriggerDays.has(payable.daysFromToday)
    );
    const overdueCount = reminderPayables.filter((payable) => payable.daysFromToday < 0).length;
    const dueTodayCount = reminderPayables.filter((payable) => payable.daysFromToday === 0).length;
    const dueTomorrowCount = reminderPayables.filter((payable) => payable.daysFromToday === 1).length;
    const dueInThreeDaysCount = reminderPayables.filter((payable) => payable.daysFromToday === 3).length;

    if (!reminderPayables.length) {
        dashboardRemindersSubtitle.textContent = "Sem alertas para hoje, amanha ou D-3";
        dashboardRemindersList.innerHTML =
            '<li class="reminder-empty">Sem lembretes ativos. O sistema alerta em D-3, amanha, hoje e vencidas.</li>';
        return;
    }

    dashboardRemindersSubtitle.textContent =
        `${overdueCount} vencidas | ${dueTodayCount} hoje | ${dueTomorrowCount} amanha | ${dueInThreeDaysCount} em 3 dias`;

    const rankedReminders = [...reminderPayables]
        .sort((a, b) => {
            const priorityDifference = getReminderPriority(a.daysFromToday) - getReminderPriority(b.daysFromToday);
            if (priorityDifference !== 0) {
                return priorityDifference;
            }
            if (a.daysFromToday === b.daysFromToday) {
                return a.id - b.id;
            }
            return a.daysFromToday - b.daysFromToday;
        })
        .slice(0, 8);

    dashboardRemindersList.innerHTML = rankedReminders
        .map((payable) => {
            const relativeText = formatRelativeDueText(payable.daysFromToday);
            const reminderStatusClass = getReminderStatusClass(payable.daysFromToday);
            const installmentLabel =
                payable.installment_number && payable.installment_total
                    ? ` - Parcela ${payable.installment_number}/${payable.installment_total}`
                    : "";
            const bankName = payable.bank?.name || "Sem banco";

            return `
                <li class="reminder-item ${reminderStatusClass}">
                    <div class="reminder-main">
                        <p class="reminder-title">${payable.title}${installmentLabel}</p>
                        <p class="reminder-meta">${relativeText} | ${formatDate(payable.due_date)} | ${bankName}</p>
                    </div>
                    <span class="reminder-amount">-${formatCurrency(payable.amount)}</span>
                </li>
            `;
        })
        .join("");
};

const getInstallmentDetailReferenceId = (installment) => {
    if (!installment) {
        return null;
    }
    if (!installment.installment_group) {
        return installment.id;
    }
    const groupItems = payables
        .filter((item) => item.installment_group === installment.installment_group)
        .sort((a, b) => {
            if (a.installment_number === b.installment_number) {
                return a.id - b.id;
            }
            return (a.installment_number || 0) - (b.installment_number || 0);
        });
    return groupItems[0]?.id || installment.id;
};

const updateReconciliationCard = () => {
    if (!dashboardReconciliationList || !dashboardReconciliationSubtitle) {
        return;
    }

    const pendingInstallments = payables
        .filter(
            (payable) =>
                payable.payable_type === "installment" &&
                payable.status === "paid" &&
                !payable.payment_receipt_url
        )
        .sort((a, b) => {
            const paymentA = a.payment_date || a.due_date;
            const paymentB = b.payment_date || b.due_date;
            if (paymentA === paymentB) {
                return a.id - b.id;
            }
            return paymentA > paymentB ? -1 : 1;
        });

    if (!pendingInstallments.length) {
        dashboardReconciliationSubtitle.textContent = "Sem pendencias";
        dashboardReconciliationList.innerHTML =
            '<li class="reconciliation-empty">Todas as parcelas pagas possuem comprovante.</li>';
        return;
    }

    const totalLabel =
        pendingInstallments.length === 1
            ? "1 parcela paga sem comprovante"
            : `${pendingInstallments.length} parcelas pagas sem comprovante`;
    dashboardReconciliationSubtitle.textContent = totalLabel;

    dashboardReconciliationList.innerHTML = pendingInstallments
        .slice(0, 8)
        .map((installment) => {
            const paymentLabel = installment.payment_date ? formatDate(installment.payment_date) : "sem data";
            const detailReferenceId = getInstallmentDetailReferenceId(installment);
            return `
                <li class="reconciliation-item">
                    <div class="reconciliation-main">
                        <p class="reconciliation-title">${escapeHtml(installment.title)} - ${getInstallmentShortLabel(installment)}</p>
                        <p class="reconciliation-meta">Pago em ${paymentLabel} | Venc. ${formatDate(installment.due_date)} | ${formatCurrency(installment.amount)}</p>
                    </div>
                    <div class="reconciliation-actions">
                        <button
                            type="button"
                            class="receipt-view-btn"
                            data-reconciliation-action="attach-receipt"
                            data-id="${installment.id}"
                        >
                            <i class="ph ph-paperclip"></i> Anexar
                        </button>
                        <button
                            type="button"
                            class="receipt-view-btn history-view-btn"
                            data-reconciliation-action="open-details"
                            data-id="${detailReferenceId}"
                        >
                            <i class="ph ph-list-magnifying-glass"></i> Detalhes
                        </button>
                    </div>
                </li>
            `;
        })
        .join("");
};

const getPayableStatusInfoFromState = (statusState) => {
    if (statusState === "paid") {
        return { label: "Pago", className: "status-paid" };
    }
    if (statusState === "overdue") {
        return { label: "Vencida", className: "status-overdue" };
    }
    return { label: "Pendente", className: "status-pending" };
};

const getPayableStatusInfo = (payable) => {
    if (payable.status === "paid") {
        return { label: "Pago", className: "status-paid" };
    }
    if (isPayableOverdue(payable)) {
        return { label: "Vencida", className: "status-overdue" };
    }
    return { label: "Pendente", className: "status-pending" };
};

const getInstallmentGroupMembers = (referencePayable) => {
    if (!referencePayable || referencePayable.payable_type !== "installment") {
        return [];
    }

    if (referencePayable.installment_group) {
        return payables
            .filter((item) => item.installment_group === referencePayable.installment_group)
            .sort((a, b) => {
                if (a.installment_number === b.installment_number) {
                    return a.id - b.id;
                }
                return (a.installment_number || 0) - (b.installment_number || 0);
            });
    }

    return [referencePayable];
};

const getInstallmentSummaryText = (installments) => {
    const total = installments.length;
    const paidCount = installments.filter((item) => item.status === "paid").length;
    const overdueCount = installments.filter((item) => isPayableOverdue(item)).length;
    const pendingCount = total - paidCount;
    const totalAmount = installments.reduce((sum, installment) => sum + Number(installment.amount), 0);
    return `${total} parcelas | ${paidCount} pagas | ${pendingCount} pendentes | ${overdueCount} vencidas | Total ${formatCurrency(totalAmount)}`;
};

const buildPayableEntityFromSingle = (payable) => {
    const isInstallment = payable.payable_type === "installment";
    const canOpenDetails = isInstallment && Number(payable.installment_total || 0) > 1;
    const statusState = payable.status === "paid" ? "paid" : isPayableOverdue(payable) ? "overdue" : "pending";
    const paidCount = payable.status === "paid" ? 1 : 0;
    const totalCount = payable.installment_total || 1;
    const progressPercent = Math.round((paidCount / totalCount) * 100);

    return {
        id: payable.id,
        key: `single-${payable.id}`,
        payable_type: payable.payable_type,
        category: payable.category || null,
        title: payable.title,
        description: payable.description,
        bank: payable.bank,
        due_date: payable.due_date,
        status_state: statusState,
        installment_text:
            payable.installment_number && payable.installment_total
                ? `${payable.installment_number}/${payable.installment_total}`
                : "-",
        amount_total: Number(payable.amount),
        members: [payable],
        detail_reference_id: payable.id,
        can_open_details: canOpenDetails,
        can_edit: !isInstallment,
        is_grouped_installment: false,
        paid_count: paidCount,
        total_count: totalCount,
        progress_percent: progressPercent,
    };
};

const buildPayableEntityFromInstallmentGroup = (installments) => {
    const sortedInstallments = [...installments].sort((a, b) => {
        if (a.installment_number === b.installment_number) {
            return a.id - b.id;
        }
        return (a.installment_number || 0) - (b.installment_number || 0);
    });
    const firstInstallment = sortedInstallments[0];
    const pendingInstallments = sortedInstallments.filter((installment) => installment.status === "pending");
    const overdueInstallments = pendingInstallments.filter((installment) => isPayableOverdue(installment));
    const paidCount = sortedInstallments.filter((installment) => installment.status === "paid").length;
    const totalCount = sortedInstallments.length;

    const statusState =
        paidCount === totalCount ? "paid" : overdueInstallments.length ? "overdue" : "pending";

    const nextPendingDueDate = [...pendingInstallments]
        .sort((a, b) => (a.due_date > b.due_date ? 1 : -1))
        .map((installment) => installment.due_date)[0];

    const dueDate = nextPendingDueDate || sortedInstallments[sortedInstallments.length - 1].due_date;
    const totalAmount = sortedInstallments.reduce((sum, installment) => sum + Number(installment.amount), 0);

    return {
        id: firstInstallment.id,
        key: `group-${firstInstallment.installment_group}`,
        payable_type: PayableTypeInstallment,
        category: firstInstallment.category || null,
        title: firstInstallment.title,
        description: firstInstallment.description,
        bank: firstInstallment.bank,
        due_date: dueDate,
        status_state: statusState,
        installment_text: `${paidCount}/${totalCount} pagas`,
        amount_total: totalAmount,
        members: sortedInstallments,
        detail_reference_id: firstInstallment.id,
        can_open_details: true,
        can_edit: false,
        is_grouped_installment: true,
        paid_count: paidCount,
        total_count: totalCount,
        progress_percent: Math.round((paidCount / totalCount) * 100),
    };
};

const PayableTypeInstallment = "installment";

const buildPayableEntities = () => {
    const groupedInstallments = new Map();
    const entities = [];

    payables.forEach((payable) => {
        const isGroupedInstallment =
            payable.payable_type === PayableTypeInstallment &&
            Boolean(payable.installment_group) &&
            Number(payable.installment_total || 0) > 1;

        if (!isGroupedInstallment) {
            entities.push(buildPayableEntityFromSingle(payable));
            return;
        }

        const groupId = payable.installment_group;
        if (!groupedInstallments.has(groupId)) {
            groupedInstallments.set(groupId, []);
        }
        groupedInstallments.get(groupId).push(payable);
    });

    groupedInstallments.forEach((installments) => {
        entities.push(buildPayableEntityFromInstallmentGroup(installments));
    });

    return entities;
};

const buildPayableEntitySearchBlob = (entity) => {
    const memberBlob = entity.members.map((member) => buildPayableSearchBlob(member)).join(" ");
    const statusInfo = getPayableStatusInfoFromState(entity.status_state);

    return [
        memberBlob,
        entity.title,
        entity.description,
        entity.category?.name || "",
        entity.installment_text,
        statusInfo.label,
        entity.status_state,
        entity.bank?.name || "sem banco",
        formatCurrency(entity.amount_total),
        String(entity.amount_total.toFixed(2)).replace(".", ","),
    ].join(" ");
};

const getFilteredPayables = (payableEntities) =>
    payableEntities.filter((entity) => {
        if (payableStatusFilter !== "all" && entity.status_state !== payableStatusFilter) {
            return false;
        }

        if (payableTypeFilter !== "all" && entity.payable_type !== payableTypeFilter) {
            return false;
        }

        if (payableCategoryFilter === "none" && entity.category) {
            return false;
        }
        if (
            payableCategoryFilter !== "all" &&
            payableCategoryFilter !== "none" &&
            String(entity.category?.id || "") !== payableCategoryFilter
        ) {
            return false;
        }

        if (payableBankFilter === "none" && entity.bank) {
            return false;
        }
        if (
            payableBankFilter !== "all" &&
            payableBankFilter !== "none" &&
            String(entity.bank?.id || "") !== payableBankFilter
        ) {
            return false;
        }

        if (payableExactDateFilter) {
            const hasDateMatch = entity.members.some((member) => member.due_date === payableExactDateFilter);
            if (!hasDateMatch) {
                return false;
            }
        } else if (payablePeriodFilter === "overdue") {
            if (entity.status_state !== "overdue") {
                return false;
            }
        } else if (!isDateInPeriod(entity.due_date, payablePeriodFilter)) {
            return false;
        }

        return matchSmartQuery(payableSearchQuery, buildPayableEntitySearchBlob(entity));
    });

const mergeUpdatedPayables = (updatedPayables) => {
    if (!Array.isArray(updatedPayables) || !updatedPayables.length) {
        return;
    }
    const updatedById = new Map(updatedPayables.map((payable) => [payable.id, payable]));
    payables = payables.map((payable) => updatedById.get(payable.id) || payable);
};

const syncInstallmentBulkControls = (installments) => {
    if (!installmentBulkUntilSelect) {
        return;
    }
    installmentBulkUntilSelect.innerHTML = installments
        .map((installment) => {
            const number = installment.installment_number || 1;
            return `<option value="${number}">${number}</option>`;
        })
        .join("");
    installmentBulkUntilSelect.value = String(installments.length);
};

const getPayableById = (payableId) => payables.find((item) => item.id === payableId) || null;

const getInstallmentShortLabel = (installment) =>
    `Parcela ${installment.installment_number || 1}/${installment.installment_total || 1}`;

const openReceiptPromptModal = (payableId) => {
    const installment = getPayableById(payableId);
    if (!installment || installment.status !== "paid") {
        return;
    }
    pendingReceiptPromptInstallmentId = payableId;
    if (receiptPromptMessage) {
        receiptPromptMessage.textContent = `${getInstallmentShortLabel(installment)} marcada como paga. Deseja anexar comprovante agora?`;
    }
    openModal("receiptPromptModal");
};

const openReceiptUploadModal = (payableId) => {
    const installment = getPayableById(payableId);
    if (!installment || installment.status !== "paid") {
        return;
    }

    receiptUploadInstallmentId = payableId;
    if (receiptUploadTitle) {
        receiptUploadTitle.textContent = `Comprovante - ${getInstallmentShortLabel(installment)}`;
    }
    if (receiptUploadMeta) {
        const dueDateLabel = formatDate(installment.due_date);
        receiptUploadMeta.textContent = `${installment.title} | vencimento ${dueDateLabel}`;
    }
    if (receiptUploadCurrent) {
        receiptUploadCurrent.textContent = installment.payment_receipt_name
            ? `Comprovante atual: ${installment.payment_receipt_name}`
            : "Nenhum comprovante anexado ainda.";
    }
    if (receiptFileField) {
        receiptFileField.value = "";
    }
    if (receiptUploadError) {
        receiptUploadError.textContent = "";
    }
    if (receiptDeleteBtn) {
        receiptDeleteBtn.classList.toggle("is-hidden", !installment.payment_receipt_url);
    }
    renderReceiptPreview(installment);
    openModal("receiptUploadModal");
};

const renderInstallmentHistoryItems = (historyItems) => {
    if (!installmentHistoryList) {
        return;
    }
    if (!Array.isArray(historyItems) || !historyItems.length) {
        installmentHistoryList.innerHTML = '<li class="history-empty">Sem historico de alteracoes para esta parcela.</li>';
        return;
    }

    installmentHistoryList.innerHTML = historyItems
        .map((item) => {
            const previousStatus = statusLabelMap[item.previous_status] || item.previous_status;
            const newStatus = statusLabelMap[item.new_status] || item.new_status;
            const previousDate = item.previous_payment_date ? formatDate(item.previous_payment_date) : "-";
            const newDate = item.new_payment_date ? formatDate(item.new_payment_date) : "-";
            const previousNote = item.previous_payment_note || "-";
            const newNote = item.new_payment_note || "-";
            const changedBy = item.changed_by || "Sistema";
            const changedAt = formatHistoryDateTime(item.changed_at);
            const statusClass = item.new_status === "paid" ? "history-status-paid" : "history-status-pending";
            return `
                <li class="history-item">
                    <div class="history-content">
                        <p class="history-main">
                            <span class="history-badge">${previousStatus}</span>
                            <i class="ph ph-arrow-right history-arrow"></i>
                            <span class="history-badge ${statusClass}">${newStatus}</span>
                        </p>
                        <p class="history-meta">Pagamento: <span class="tabular-num">${previousDate}</span> -> <span class="tabular-num">${newDate}</span></p>
                        <p class="history-meta">Obs: ${escapeHtml(previousNote)} -> ${escapeHtml(newNote)}</p>
                        <p class="history-meta">Por: ${escapeHtml(changedBy)} | <span class="tabular-num">${changedAt}</span> | origem: ${escapeHtml(item.source)}</p>
                    </div>
                </li>
            `;
        })
        .join("");
};

const openInstallmentHistoryModal = async (payableId) => {
    if (!bodyData.payableHistoryUrlTemplate) {
        return;
    }
    const installment = getPayableById(payableId);
    if (!installment) {
        return;
    }

    activeHistoryInstallmentId = payableId;
    if (installmentHistoryTitle) {
        installmentHistoryTitle.textContent = `Historico - ${getInstallmentShortLabel(installment)}`;
    }
    if (installmentHistoryMeta) {
        installmentHistoryMeta.textContent = installment.title;
    }
    if (installmentHistoryError) {
        installmentHistoryError.textContent = "";
    }
    if (installmentHistoryList) {
        installmentHistoryList.innerHTML = '<li class="history-empty">Carregando historico...</li>';
    }

    openModal("installmentHistoryModal");

    const endpoint = getResourceUrl(bodyData.payableHistoryUrlTemplate, payableId);
    try {
        const response = await fetch(endpoint, { method: "GET" });
        const payload = await response.json();
        if (!response.ok || !payload.ok) {
            if (installmentHistoryError) {
                installmentHistoryError.textContent = collectFirstError(payload.errors || {});
            }
            if (installmentHistoryList) {
                installmentHistoryList.innerHTML = "";
            }
            return;
        }
        renderInstallmentHistoryItems(payload.history || []);
    } catch (_error) {
        if (installmentHistoryError) {
            installmentHistoryError.textContent = "Erro de conexao. Tente novamente.";
        }
        if (installmentHistoryList) {
            installmentHistoryList.innerHTML = "";
        }
    }
};

const renderInstallmentDetails = (referencePayableId) => {
    if (!installmentDetailsTitle || !installmentDetailsSummary || !installmentDetailsBody) {
        return;
    }

    const referencePayable = getPayableById(referencePayableId);
    if (!referencePayable) {
        closeModal("installmentDetailsModal");
        activeInstallmentDetailsId = null;
        return;
    }

    const installments = getInstallmentGroupMembers(referencePayable);
    if (!installments.length) {
        installmentDetailsBody.innerHTML = '<tr><td class="empty" colspan="7">Nenhuma parcela encontrada.</td></tr>';
        installmentDetailsSummary.textContent = "";
        if (installmentBulkUntilSelect) {
            installmentBulkUntilSelect.innerHTML = "";
        }
        return;
    }

    syncInstallmentBulkControls(installments);
    if (installmentPaymentDateField && !installmentPaymentDateField.value) {
        installmentPaymentDateField.value = initialData.today;
    }
    if (installmentBulkError) {
        installmentBulkError.textContent = "";
    }

    installmentDetailsTitle.textContent = `${referencePayable.title} - Detalhes`;
    installmentDetailsSummary.textContent = getInstallmentSummaryText(installments);
    installmentDetailsBody.innerHTML = installments
        .map((installment) => {
            const status = getPayableStatusInfo(installment);
            const nextStatus = installment.status === "paid" ? "pending" : "paid";
            const nextActionLabel = installment.status === "paid" ? "Marcar pendente" : "Marcar pago";
            const paymentDateLabel = formatOptionalDate(installment.payment_date);
            const paymentNoteLabel = installment.payment_note ? escapeHtml(installment.payment_note) : "-";
            const daysFromToday = getDaysFromToday(installment.due_date);
            const dueSubLabel =
                installment.status === "paid"
                    ? installment.payment_date
                        ? `Pago em ${formatDate(installment.payment_date)}`
                        : "Pago"
                    : formatRelativeDueText(daysFromToday);
            const dueSubClass =
                installment.status === "paid"
                    ? "due-paid"
                    : daysFromToday < 0
                        ? "due-overdue"
                        : daysFromToday <= 3
                            ? "due-soon"
                            : "due-future";
            const hasReceipt = Boolean(installment.payment_receipt_url);
            const viewReceiptAction = hasReceipt
                ? `
                    <button
                        type="button"
                        class="receipt-view-btn"
                        data-installment-action="open-receipt-modal"
                        data-id="${installment.id}"
                        title="Visualizar comprovante"
                    >
                        <i class="ph ph-eye"></i> Ver comprovante
                    </button>
                `
                : "";
            const historyAction = `
                <button
                    type="button"
                    class="receipt-view-btn history-view-btn"
                    data-installment-action="open-history-modal"
                    data-id="${installment.id}"
                    title="Ver historico da parcela"
                >
                    <i class="ph ph-clock-counter-clockwise"></i> Historico
                </button>
            `;

            return `
                <tr>
                    <td><span class="parcel-copy tabular-num parcel-id-chip">${installment.installment_number}/${installment.installment_total}</span></td>
                    <td>
                        <div class="installment-due-main tabular-num">${formatDate(installment.due_date)}</div>
                        <div class="installment-due-sub ${dueSubClass}">${dueSubLabel}</div>
                    </td>
                    <td><span class="payable-status ${status.className}">${status.label}</span></td>
                    <td class="tabular-num">${paymentDateLabel}</td>
                    <td class="parcel-copy installment-note-cell">${paymentNoteLabel}</td>
                    <td class="${installment.status === "paid" ? "amount-income" : "amount-expense"} tabular-num">-${formatCurrency(installment.amount)}</td>
                    <td>
                        <div class="installment-actions installment-actions-compact">
                            <button
                                class="status-toggle-btn"
                                data-installment-action="toggle-status"
                                data-id="${installment.id}"
                                data-status="${nextStatus}"
                            >
                                ${nextActionLabel}
                            </button>
                            ${historyAction}
                            ${viewReceiptAction}
                        </div>
                    </td>
                </tr>
            `;
        })
        .join("");
};

const openInstallmentDetailsModal = (payableId) => {
    activeInstallmentDetailsId = payableId;
    pendingReceiptPromptInstallmentId = null;
    receiptUploadInstallmentId = null;
    if (installmentPaymentDateField) {
        installmentPaymentDateField.value = initialData.today;
    }
    if (installmentPaymentNoteField) {
        installmentPaymentNoteField.value = "";
    }
    if (installmentBulkError) {
        installmentBulkError.textContent = "";
    }
    renderInstallmentDetails(payableId);
    openModal("installmentDetailsModal");
};

const updatePayablesSummary = (filteredEntities, totalEntities) => {
    let pending = 0;
    let overdue = 0;
    let paid = 0;

    filteredEntities.forEach((entity) => {
        entity.members.forEach((payable) => {
            const amount = Number(payable.amount);
            if (payable.status === "paid") {
                paid += amount;
                return;
            }
            if (isPayableOverdue(payable)) {
                overdue += amount;
                return;
            }
            pending += amount;
        });
    });

    summaryPayablePending.textContent = formatCurrency(pending);
    summaryPayableOverdue.textContent = formatCurrency(overdue);
    summaryPayablePaid.textContent = formatCurrency(paid);
    summaryPayableCount.textContent = String(filteredEntities.length);

    const overdueEntityCount = filteredEntities.filter((entity) => entity.status_state === "overdue").length;
    if (!hasActivePayableFilters()) {
        payablesSubtitle.textContent = `${filteredEntities.length} contas (${overdueEntityCount} vencidas)`;
        return;
    }

    payablesSubtitle.textContent = `Exibindo ${filteredEntities.length} de ${totalEntities.length} contas (${overdueEntityCount} vencidas)`;
};

const renderPayablesTable = (filteredEntities) => {
    if (!payablesBody) {
        return;
    }

    if (!filteredEntities.length) {
        payablesBody.innerHTML = hasActivePayableFilters()
            ? '<tr><td class="empty" colspan="8">Nenhuma conta encontrada para os filtros aplicados.</td></tr>'
            : '<tr><td class="empty" colspan="8">Nenhuma conta a pagar cadastrada.</td></tr>';
        return;
    }

    const sorted = [...filteredEntities].sort((a, b) => {
        if (a.due_date === b.due_date) {
            return b.id - a.id;
        }
        return a.due_date > b.due_date ? 1 : -1;
    });

    payablesBody.innerHTML = sorted
        .map((entity) => {
            const status = getPayableStatusInfoFromState(entity.status_state);
            const payableTypeLabel = payableTypeLabels[entity.payable_type] || "Outro";
            const payableCategoryLabel = entity.category?.name || payableTypeLabel;
            const categoryMeta = entity.category
                ? `<span class="payable-category-base">${payableTypeLabel}</span>`
                : "";
            const bankText = entity.bank
                ? `<span class="bank-tag"><i class="ph ${normalizeBankIcon(entity.bank.icon)} bank-icon-inline"></i><span class="bank-dot" style="background:${entity.bank.color};"></span>${entity.bank.name}</span>`
                : '<span class="parcel-copy">-</span>';
            const amountClass = entity.status_state === "paid" ? "amount-income" : "amount-expense";
            const installmentColumn = entity.is_grouped_installment
                ? `
                    <div class="installment-progress">
                        <span class="parcel-copy">${entity.installment_text}</span>
                        <div class="installment-progress-track">
                            <span class="installment-progress-fill" style="width:${entity.progress_percent}%;"></span>
                        </div>
                    </div>
                `
                : `<span class="parcel-copy">${entity.installment_text}</span>`;

            return `
                <tr>
                    <td class="tabular-num">${formatDate(entity.due_date)}</td>
                    <td>${entity.title}</td>
                    <td>
                        <div class="payable-category-cell">
                            <span class="type-pill type-neutral">${escapeHtml(payableCategoryLabel)}</span>
                            ${categoryMeta}
                        </div>
                    </td>
                    <td>${bankText}</td>
                    <td><span class="payable-status ${status.className}">${status.label}</span></td>
                    <td>${installmentColumn}</td>
                    <td class="${amountClass} tabular-num">-${formatCurrency(entity.amount_total)}</td>
                    <td>
                        <div class="actions">
                            ${
                                entity.can_open_details
                                    ? `<button class="action-btn action-btn-detail" title="Detalhes do parcelamento" data-payable-action="details" data-id="${entity.detail_reference_id}">
                                <i class="ph ph-list-magnifying-glass"></i>
                                <span>Detalhes</span>
                            </button>`
                                    : ""
                            }
                            ${
                                entity.can_edit
                                    ? `<button class="action-btn" title="Editar" data-payable-action="edit" data-id="${entity.id}">
                                <i class="ph ph-pencil-simple"></i>
                            </button>`
                                    : ""
                            }
                            <button class="action-btn" title="Remover" data-payable-action="delete" data-id="${entity.id}">
                                <i class="ph ph-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        })
        .join("");
};

const getCurrentPayableFiltering = () => {
    const payableEntities = buildPayableEntities();
    const filteredEntities = getFilteredPayables(payableEntities);
    return { payableEntities, filteredEntities };
};

const getFilteredPayableMembers = (filteredEntities) => {
    const unique = new Map();
    filteredEntities.forEach((entity) => {
        entity.members.forEach((member) => {
            unique.set(member.id, member);
        });
    });
    return Array.from(unique.values());
};

const renderPayableCalendar = () => {
    if (!payableCalendarGrid || !payableCalendarMonthLabel || !payableCalendarSelectionLabel) {
        return;
    }

    const calendarYear = payableCalendarCursorDate.getFullYear();
    const calendarMonth = payableCalendarCursorDate.getMonth();
    const monthStart = new Date(calendarYear, calendarMonth, 1);
    const monthEnd = new Date(calendarYear, calendarMonth + 1, 0);
    const firstWeekday = monthStart.getDay();
    const daysInMonth = monthEnd.getDate();
    const monthLabel = new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
    }).format(new Date(calendarYear, calendarMonth, 1));
    payableCalendarMonthLabel.textContent = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

    const payableMapByDate = new Map();
    payables.forEach((payable) => {
        const isoDate = payable.due_date;
        if (!payableMapByDate.has(isoDate)) {
            payableMapByDate.set(isoDate, []);
        }
        payableMapByDate.get(isoDate).push(payable);
    });

    if (payableExactDateFilter) {
        const count = payableMapByDate.get(payableExactDateFilter)?.length || 0;
        payableCalendarSelectionLabel.textContent = `${formatDate(payableExactDateFilter)} selecionado (${count} contas)`;
    } else {
        payableCalendarSelectionLabel.textContent = "Nenhum dia selecionado";
    }

    const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
    const cells = weekdayLabels
        .map((weekday) => `<div class="payable-calendar-weekday">${weekday}</div>`)
        .join("");

    const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
    const dayCells = [];
    for (let cellIndex = 0; cellIndex < totalCells; cellIndex += 1) {
        const dayNumber = cellIndex - firstWeekday + 1;
        if (dayNumber < 1 || dayNumber > daysInMonth) {
            dayCells.push('<div class="payable-calendar-day is-outside"></div>');
            continue;
        }

        const isoDate = toIsoDate(new Date(calendarYear, calendarMonth, dayNumber));
        const dayPayables = payableMapByDate.get(isoDate) || [];
        const pendingCount = dayPayables.filter((item) => item.status === "pending").length;
        const paidCount = dayPayables.filter((item) => item.status === "paid").length;
        const isSelected = payableExactDateFilter === isoDate;
        const isToday = isoDate === initialData.today;
        const hasOverdue = dayPayables.some((item) => item.status === "pending" && item.due_date < initialData.today);
        const hasPending = dayPayables.some((item) => item.status === "pending" && item.due_date >= initialData.today);
        let toneClass = "";
        if (hasOverdue) {
            toneClass = "is-overdue";
        } else if (hasPending) {
            toneClass = "is-pending";
        } else if (paidCount > 0) {
            toneClass = "is-paid";
        }

        const countLabel = dayPayables.length ? `${dayPayables.length} contas` : "Sem contas";
        const detailsLabel =
            dayPayables.length > 0
                ? `<small>${pendingCount} pend. | ${paidCount} pag.</small>`
                : '<small>Sem lancamentos</small>';
        dayCells.push(`
            <button
                type="button"
                class="payable-calendar-day ${toneClass} ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""}"
                data-calendar-date="${isoDate}"
                title="${countLabel}"
            >
                <strong>${dayNumber}</strong>
                <span>${countLabel}</span>
                ${detailsLabel}
            </button>
        `);
    }

    payableCalendarGrid.innerHTML = `${cells}${dayCells.join("")}`;
};

const syncPayableBulkActionFields = () => {
    if (!payableBulkActionField) {
        return;
    }
    const action = payableBulkActionField.value || "mark_paid";
    const shouldShowPaymentMeta = action === "mark_paid";
    if (payableBulkPaymentDateWrap) {
        payableBulkPaymentDateWrap.classList.toggle("is-hidden", !shouldShowPaymentMeta);
    }
    if (payableBulkPaymentNoteWrap) {
        payableBulkPaymentNoteWrap.classList.toggle("is-hidden", !shouldShowPaymentMeta);
    }
};

const updatePayableBulkSummary = (filteredEntities) => {
    if (!payableBulkSummary) {
        return;
    }
    const members = getFilteredPayableMembers(filteredEntities);
    const pendingCount = members.filter((payable) => payable.status === "pending").length;
    const paidCount = members.filter((payable) => payable.status === "paid").length;
    const overdueCount = members.filter((payable) => isPayableOverdue(payable)).length;
    const totalAmount = members.reduce((sum, payable) => sum + Number(payable.amount), 0);
    payableBulkSummary.textContent = `${members.length} parcelas filtradas | ${pendingCount} pendentes | ${paidCount} pagas | ${overdueCount} vencidas | Total ${formatCurrency(totalAmount)}`;
    if (applyPayableBulkActionBtn) {
        applyPayableBulkActionBtn.disabled = members.length === 0;
    }
};

const submitPayableBulkAction = async () => {
    if (!bodyData.payableBulkActionUrl || !payableBulkActionField) {
        return;
    }
    if (payableBulkActionError) {
        payableBulkActionError.textContent = "";
    }

    const { filteredEntities } = getCurrentPayableFiltering();
    const members = getFilteredPayableMembers(filteredEntities);
    if (!members.length) {
        if (payableBulkActionError) {
            payableBulkActionError.textContent = "Nenhuma conta no resultado filtrado.";
        }
        return;
    }

    const action = payableBulkActionField.value || "mark_paid";
    if (action === "delete") {
        const confirmed = window.confirm(
            `Deseja excluir ${members.length} contas da lista filtrada? Essa acao nao pode ser desfeita.`
        );
        if (!confirmed) {
            return;
        }
    }

    const payload = {
        action,
        payable_ids: members.map((member) => member.id),
    };
    if (action === "mark_paid") {
        payload.payment_date = payableBulkPaymentDateField?.value || initialData.today;
        payload.payment_note = payableBulkPaymentNoteField?.value || "";
    }

    if (applyPayableBulkActionBtn) {
        applyPayableBulkActionBtn.disabled = true;
    }
    try {
        const response = await fetch(bodyData.payableBulkActionUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken"),
            },
            body: JSON.stringify(payload),
        });
        const responsePayload = await response.json();
        if (!response.ok || !responsePayload.ok) {
            if (payableBulkActionError) {
                payableBulkActionError.textContent = collectFirstError(responsePayload.errors || {});
            }
            return;
        }

        if (action === "delete") {
            const deletedIds = Array.isArray(responsePayload.deleted_ids)
                ? responsePayload.deleted_ids.map((id) => Number(id))
                : [];
            payables = payables.filter((payable) => !deletedIds.includes(payable.id));
        } else {
            mergeUpdatedPayables(responsePayload.payables || []);
        }
        triggerSuccessFeedback(applyPayableBulkActionBtn);
        refreshPayables();
    } catch (_error) {
        if (payableBulkActionError) {
            payableBulkActionError.textContent = "Erro de conexao. Tente novamente.";
        }
    } finally {
        if (applyPayableBulkActionBtn) {
            applyPayableBulkActionBtn.disabled = false;
        }
    }
};

const submitPayableCategory = async (event) => {
    event.preventDefault();
    if (!payableCategoryForm || !bodyData.payableCategoryCreateUrl) {
        return;
    }
    if (payableCategoryFormError) {
        payableCategoryFormError.textContent = "";
    }

    const formData = new FormData(payableCategoryForm);
    try {
        const response = await fetch(bodyData.payableCategoryCreateUrl, {
            method: "POST",
            headers: { "X-CSRFToken": getCookie("csrftoken") },
            body: formData,
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok) {
            if (payableCategoryFormError) {
                payableCategoryFormError.textContent = collectFirstError(payload.errors || {});
            }
            return;
        }

        payableCategories.push(payload.category);
        resetPayableCategoryForm();
        syncBankUiState();
        renderPayableCategoryList();
    } catch (_error) {
        if (payableCategoryFormError) {
            payableCategoryFormError.textContent = "Erro de conexao. Tente novamente.";
        }
    }
};

const submitPayableCategoryDelete = async (categoryId) => {
    if (!bodyData.payableCategoryDeleteUrlTemplate || !Number.isFinite(categoryId)) {
        return;
    }
    const endpoint = getResourceUrl(bodyData.payableCategoryDeleteUrlTemplate, categoryId);
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "X-CSRFToken": getCookie("csrftoken") },
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok) {
            if (payableCategoryFormError) {
                payableCategoryFormError.textContent = collectFirstError(payload.errors || {});
            }
            return;
        }

        payableCategories = payableCategories.filter((category) => category.id !== payload.deleted_id);
        payables = payables.map((payable) =>
            payable.category && payable.category.id === payload.deleted_id ? { ...payable, category: null } : payable
        );
        if (payableCategoryFilter === String(payload.deleted_id)) {
            payableCategoryFilter = "all";
        }
        syncBankUiState();
        refreshPayables();
    } catch (_error) {
        if (payableCategoryFormError) {
            payableCategoryFormError.textContent = "Erro de conexao. Tente novamente.";
        }
    }
};

const refreshPayables = () => {
    const { payableEntities, filteredEntities } = getCurrentPayableFiltering();
    updatePayablesSummary(filteredEntities, payableEntities);
    renderPayablesTable(filteredEntities);
    updateDashboardReminders();
    updateReconciliationCard();
    updatePayableBulkSummary(filteredEntities);
    renderPayableCategoryList();
    renderPayableCalendar();
    refreshBanksTab();
    if (activeInstallmentDetailsId) {
        renderInstallmentDetails(activeInstallmentDetailsId);
    }
};

const getBankUsageMap = () => {
    const usageMap = new Map();
    banks.forEach((bank) => {
        usageMap.set(bank.id, { transactions: 0, payables: 0 });
    });

    transactions.forEach((transaction) => {
        const bankId = transaction.bank?.id;
        if (!usageMap.has(bankId)) {
            return;
        }
        usageMap.get(bankId).transactions += 1;
    });

    payables.forEach((payable) => {
        const bankId = payable.bank?.id;
        if (!usageMap.has(bankId)) {
            return;
        }
        usageMap.get(bankId).payables += 1;
    });

    return usageMap;
};

const refreshBanksTab = () => {
    if (!banksBody || !summaryBankCount || !summaryBankInUse || !summaryBankUnused || !summaryBankPayables || !banksSubtitle) {
        return;
    }

    const usageMap = getBankUsageMap();
    const banksWithTransactions = banks.filter((bank) => (usageMap.get(bank.id)?.transactions || 0) > 0).length;
    const banksWithPayables = banks.filter((bank) => (usageMap.get(bank.id)?.payables || 0) > 0).length;
    const banksWithoutUsage = banks.filter((bank) => {
        const usage = usageMap.get(bank.id) || { transactions: 0, payables: 0 };
        return usage.transactions === 0 && usage.payables === 0;
    }).length;

    summaryBankCount.textContent = String(banks.length);
    summaryBankInUse.textContent = String(banksWithTransactions);
    summaryBankUnused.textContent = String(banksWithoutUsage);
    summaryBankPayables.textContent = String(banksWithPayables);
    banksSubtitle.textContent = `${banks.length} bancos cadastrados`;

    if (!banks.length) {
        banksBody.innerHTML = '<tr><td class="empty" colspan="5">Nenhum banco cadastrado.</td></tr>';
        return;
    }

    banksBody.innerHTML = banks
        .map((bank) => {
            const usage = usageMap.get(bank.id) || { transactions: 0, payables: 0 };
            const canDelete = usage.transactions === 0;
            const usageText = `${usage.transactions} transacoes | ${usage.payables} contas`;

            return `
                <tr>
                    <td>
                        <span class="bank-row-name">
                            <i class="ph ${normalizeBankIcon(bank.icon)} bank-row-icon"></i>
                            <span class="bank-dot" style="background:${bank.color};"></span>
                            ${bank.name}
                        </span>
                    </td>
                    <td><span class="bank-slug">${bank.slug}</span></td>
                    <td>
                        <span class="bank-color-chip">
                            <span class="bank-color-dot" style="background:${bank.color};"></span>
                            ${bank.color}
                        </span>
                    </td>
                    <td><span class="bank-usage">${usageText}</span></td>
                    <td>
                        <div class="actions">
                            <button
                                class="action-btn ${canDelete ? "" : "action-btn-disabled"}"
                                title="${canDelete ? "Remover banco" : "Banco com transacoes nao pode ser removido"}"
                                data-bank-action="delete"
                                data-id="${bank.id}"
                                ${canDelete ? "" : "disabled"}
                            >
                                <i class="ph ph-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        })
        .join("");
};

const getCategoryUsageMap = () => {
    const usageMap = new Map();
    payableCategories.forEach((category) => usageMap.set(category.id, 0));
    payables.forEach((payable) => {
        const categoryId = payable.category?.id;
        if (!usageMap.has(categoryId)) {
            return;
        }
        usageMap.set(categoryId, (usageMap.get(categoryId) || 0) + 1);
    });
    return usageMap;
};

const renderPayableCategoryList = () => {
    if (!payableCategoryList) {
        return;
    }

    if (!payableCategories.length) {
        payableCategoryList.innerHTML =
            '<div class="payable-category-empty">Nenhuma categoria custom cadastrada.</div>';
        return;
    }

    const usageMap = getCategoryUsageMap();
    payableCategoryList.innerHTML = payableCategories
        .map((category) => {
            const usageCount = usageMap.get(category.id) || 0;
            const usageLabel = usageCount === 1 ? "1 conta" : `${usageCount} contas`;
            return `
                <div class="payable-category-item">
                    <span class="payable-category-badge">
                        <span class="payable-category-dot" style="background:${category.color};"></span>
                        ${escapeHtml(category.name)}
                    </span>
                    <span class="payable-category-usage">${usageLabel}</span>
                    <button
                        type="button"
                        class="action-btn"
                        title="Excluir categoria"
                        data-category-action="delete"
                        data-id="${category.id}"
                    >
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
            `;
        })
        .join("");
};

const resetPayableCategoryForm = () => {
    if (!payableCategoryForm) {
        return;
    }
    payableCategoryForm.reset();
    if (payableCategoryColorField) {
        payableCategoryColorField.value = "#5D7084";
    }
    if (payableCategoryFormError) {
        payableCategoryFormError.textContent = "";
    }
};

const syncBankUiState = () => {
    syncBankCollection();
    syncPayableCategoryCollection();

    if (activeBankFilter !== "all" && !banks.some((bank) => String(bank.id) === activeBankFilter)) {
        activeBankFilter = "all";
    }
    if (
        payableBankFilter !== "all" &&
        payableBankFilter !== "none" &&
        !banks.some((bank) => String(bank.id) === payableBankFilter)
    ) {
        payableBankFilter = "all";
    }
    if (
        payableCategoryFilter !== "all" &&
        payableCategoryFilter !== "none" &&
        !payableCategories.some((category) => String(category.id) === payableCategoryFilter)
    ) {
        payableCategoryFilter = "all";
    }

    renderTransactionBankOptions();
    renderPayableBankOptions();
    renderPayableBankFilterOptions();
    renderPayableCategoryOptions();
    renderPayableCategoryFilterOptions();
    renderReportBankOptions();
    buildBankFilter();

    if (openCreateModalBtn) {
        openCreateModalBtn.disabled = !banks.length;
        openCreateModalBtn.title = banks.length ? "" : "Cadastre um banco para lancar transacoes";
    }
};

const refreshAllBankDependentViews = () => {
    syncBankUiState();
    refreshDashboard();
    refreshPayables();
};

const resetBankForm = () => {
    if (!bankForm) {
        return;
    }
    bankForm.reset();
    bankColorField.value = "#4F46E5";
    bankIconField.value = "ph-bank";
    if (bankFormError) {
        bankFormError.textContent = "";
    }
};

const openBankCreateModal = () => {
    resetBankForm();
    openModal("bankFormModal");
};

const resetForm = () => {
    transactionForm.reset();
    transactionIdField.value = "";
    dateField.value = initialData.today;
    formError.textContent = "";
};

const openCreateModal = () => {
    if (!banks.length) {
        setActiveTab("banks");
        return;
    }
    formTitle.textContent = "Nova transacao";
    resetForm();
    bankField.value = String(banks[0].id);
    openModal("formModal");
};

const openEditModal = (transactionId) => {
    const transaction = transactions.find((item) => item.id === transactionId);
    if (!transaction) {
        return;
    }

    formTitle.textContent = "Editar transacao";
    transactionIdField.value = String(transaction.id);
    titleField.value = transaction.title;
    bankField.value = String(transaction.bank.id);
    typeField.value = transaction.transaction_type;
    amountField.value = Number(transaction.amount).toFixed(2);
    dateField.value = transaction.transaction_date;
    descriptionField.value = transaction.description || "";
    formError.textContent = "";
    openModal("formModal");
};

const updateInstallmentAmountPreview = () => {
    if (!installmentAmountPreview || !payableTypeField || !payableAmountField || !payableInstallmentTotalField) {
        return;
    }

    if (payableTypeField.value !== "installment") {
        installmentAmountPreview.textContent = "";
        return;
    }

    const totalAmount = Number(payableAmountField.value);
    const totalInstallments = Number(payableInstallmentTotalField.value);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0 || !Number.isInteger(totalInstallments) || totalInstallments <= 0) {
        installmentAmountPreview.textContent = "Informe valor total e quantidade de parcelas para calcular.";
        return;
    }

    installmentAmountPreview.textContent = `Valor aproximado por parcela: ${formatCurrency(totalAmount / totalInstallments)} (${totalInstallments}x)`;
};

const togglePayableConditionalFields = () => {
    if (!payableTypeField || !installmentFields || !recurringFieldRow) {
        return;
    }

    const selectedType = payableTypeField.value;
    const isInstallment = selectedType === "installment";
    const isSubscription = selectedType === "subscription";

    installmentFields.classList.toggle("is-hidden", !isInstallment);
    recurringFieldRow.classList.toggle("is-hidden", !isSubscription);
    if (payableAmountLabel) {
        payableAmountLabel.textContent = isInstallment ? "Valor total" : "Valor";
    }

    if (!isInstallment) {
        payableInstallmentNumberField.value = "1";
        payableInstallmentTotalField.value = "";
        if (installmentAmountPreview) {
            installmentAmountPreview.textContent = "";
        }
    } else {
        payableInstallmentNumberField.value = "1";
        updateInstallmentAmountPreview();
    }

    if (!isSubscription) {
        payableRecurringField.checked = false;
    }
};

const syncPayablePaymentFields = () => {
    if (!payableStatusField || !payablePaymentDateField || !payablePaymentNoteField) {
        return;
    }
    const isPaid = payableStatusField.value === "paid";
    payablePaymentDateField.disabled = !isPaid;
    payablePaymentNoteField.disabled = !isPaid;

    if (isPaid && !payablePaymentDateField.value) {
        payablePaymentDateField.value = initialData.today;
    }
    if (!isPaid) {
        payablePaymentDateField.value = "";
        payablePaymentNoteField.value = "";
    }
};

const resetPayableForm = () => {
    payableForm.reset();
    payableIdField.value = "";
    payableModalTitle.textContent = "Nova conta a pagar";
    payableStatusField.value = "pending";
    payableTypeField.value = "invoice";
    payableInstallmentNumberField.value = "1";
    payableDueDateField.value = initialData.today;
    if (payablePaymentDateField) {
        payablePaymentDateField.value = "";
    }
    if (payablePaymentNoteField) {
        payablePaymentNoteField.value = "";
    }
    payableFormError.textContent = "";
    if (payableCategoryField) {
        payableCategoryField.value = "";
    }
    payableBankField.value = "";
    if (payableAmountLabel) {
        payableAmountLabel.textContent = "Valor";
    }
    if (installmentAmountPreview) {
        installmentAmountPreview.textContent = "";
    }
    togglePayableConditionalFields();
    syncPayablePaymentFields();
};

const openPayableCreateModal = () => {
    resetPayableForm();
    openModal("payableFormModal");
};

const clearTransactionFilters = () => {
    activeBankFilter = "all";
    transactionSearchQuery = "";
    transactionTypeFilter = "all";
    transactionPeriodFilter = "all";
    if (transactionSearchInput) {
        transactionSearchInput.value = "";
    }
    if (transactionTypeFilterSelect) {
        transactionTypeFilterSelect.value = "all";
    }
    if (transactionPeriodFilterSelect) {
        transactionPeriodFilterSelect.value = "all";
    }
    refreshDashboard();
};

const clearPayableFilters = () => {
    payableSearchQuery = "";
    payableStatusFilter = "all";
    payableTypeFilter = "all";
    payableCategoryFilter = "all";
    payableBankFilter = "all";
    payablePeriodFilter = "all";
    payableExactDateFilter = "";

    if (payableSearchInput) {
        payableSearchInput.value = "";
    }
    if (payableStatusFilterSelect) {
        payableStatusFilterSelect.value = "all";
    }
    if (payableTypeFilterSelect) {
        payableTypeFilterSelect.value = "all";
    }
    if (payableCategoryFilterSelect) {
        payableCategoryFilterSelect.value = "all";
    }
    if (payableBankFilterSelect) {
        payableBankFilterSelect.value = "all";
    }
    if (payablePeriodFilterSelect) {
        payablePeriodFilterSelect.value = "all";
    }

    refreshPayables();
};

const openPayableEditModal = (payableId) => {
    const payable = payables.find((item) => item.id === payableId);
    if (!payable) {
        return;
    }

    payableModalTitle.textContent = "Editar conta a pagar";
    payableIdField.value = String(payable.id);
    payableTitleField.value = payable.title;
    payableTypeField.value = payable.payable_type;
    if (payableCategoryField) {
        payableCategoryField.value = payable.category ? String(payable.category.id) : "";
    }
    payableBankField.value = payable.bank ? String(payable.bank.id) : "";
    payableStatusField.value = payable.status;
    payableAmountField.value = Number(payable.amount).toFixed(2);
    payableDueDateField.value = payable.due_date;
    if (payablePaymentDateField) {
        payablePaymentDateField.value = payable.payment_date || "";
    }
    if (payablePaymentNoteField) {
        payablePaymentNoteField.value = payable.payment_note || "";
    }
    payableInstallmentNumberField.value = payable.installment_number || "1";
    payableInstallmentTotalField.value = payable.installment_total || "";
    payableRecurringField.checked = Boolean(payable.is_recurring);
    payableDescriptionField.value = payable.description || "";
    payableFormError.textContent = "";
    togglePayableConditionalFields();
    updateInstallmentAmountPreview();
    syncPayablePaymentFields();
    openModal("payableFormModal");
};

const submitTransaction = async (event) => {
    event.preventDefault();
    formError.textContent = "";

    const formData = new FormData(transactionForm);
    const currentTransactionId = transactionIdField.value;
    const isEdit = Boolean(currentTransactionId);
    const endpoint = isEdit
        ? getResourceUrl(bodyData.updateUrlTemplate, currentTransactionId)
        : bodyData.createUrl;

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "X-CSRFToken": getCookie("csrftoken") },
            body: formData,
        });
        const payload = await response.json();

        if (!response.ok || !payload.ok) {
            formError.textContent = collectFirstError(payload.errors || {});
            return;
        }

        if (isEdit) {
            transactions = transactions.map((transaction) =>
                transaction.id === payload.transaction.id ? payload.transaction : transaction
            );
        } else {
            transactions.unshift(payload.transaction);
        }

        closeModal("formModal");
        refreshDashboard();
    } catch (_error) {
        formError.textContent = "Erro de conexao. Tente novamente.";
    }
};

const submitDelete = async () => {
    if (!deleteCandidateId) {
        return;
    }

    const endpoint = getResourceUrl(bodyData.deleteUrlTemplate, deleteCandidateId);
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "X-CSRFToken": getCookie("csrftoken") },
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok) {
            return;
        }

        transactions = transactions.filter((transaction) => transaction.id !== payload.deleted_id);
        deleteCandidateId = null;
        closeModal("deleteModal");
        refreshDashboard();
    } catch (_error) {
        // noop
    }
};

const submitPayable = async (event) => {
    event.preventDefault();
    payableFormError.textContent = "";

    const formData = new FormData(payableForm);
    const currentPayableId = payableIdField.value;
    const isEdit = Boolean(currentPayableId);

    if (payableTypeField.value !== "installment") {
        formData.set("installment_number", "");
        formData.set("installment_total", "");
    } else {
        formData.set("installment_number", "1");
    }

    if (payableTypeField.value !== "subscription") {
        formData.delete("is_recurring");
    }

    const endpoint = isEdit
        ? getResourceUrl(bodyData.payableUpdateUrlTemplate, currentPayableId)
        : bodyData.payableCreateUrl;

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "X-CSRFToken": getCookie("csrftoken") },
            body: formData,
        });
        const payload = await response.json();

        if (!response.ok || !payload.ok) {
            payableFormError.textContent = collectFirstError(payload.errors || {});
            return;
        }

        if (isEdit) {
            payables = payables.map((payable) =>
                payable.id === payload.payable.id ? payload.payable : payable
            );
        } else {
            if (Array.isArray(payload.payables) && payload.payables.length) {
                payload.payables.forEach((payable) => {
                    payables.unshift(payable);
                });
            } else if (payload.payable) {
                payables.unshift(payload.payable);
            }
        }

        closeModal("payableFormModal");
        refreshPayables();
    } catch (_error) {
        payableFormError.textContent = "Erro de conexao. Tente novamente.";
    }
};

const submitPayableDelete = async () => {
    if (!payableDeleteCandidateId) {
        return;
    }

    const endpoint = getResourceUrl(bodyData.payableDeleteUrlTemplate, payableDeleteCandidateId);
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "X-CSRFToken": getCookie("csrftoken") },
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok) {
            return;
        }

        const deletedIds = Array.isArray(payload.deleted_ids)
            ? payload.deleted_ids.map((id) => Number(id))
            : [Number(payload.deleted_id)];
        payables = payables.filter((payable) => !deletedIds.includes(payable.id));
        payableDeleteCandidateId = null;
        closeModal("payableDeleteModal");
        refreshPayables();
    } catch (_error) {
        // noop
    }
};

const submitBank = async (event) => {
    event.preventDefault();
    if (!bankForm) {
        return;
    }
    if (bankFormError) {
        bankFormError.textContent = "";
    }

    const formData = new FormData(bankForm);
    formData.set("icon", normalizeBankIcon(formData.get("icon")));

    try {
        const response = await fetch(bodyData.bankCreateUrl, {
            method: "POST",
            headers: { "X-CSRFToken": getCookie("csrftoken") },
            body: formData,
        });
        const payload = await response.json();

        if (!response.ok || !payload.ok) {
            if (bankFormError) {
                bankFormError.textContent = collectFirstError(payload.errors || {});
            }
            return;
        }

        banks.push(payload.bank);
        closeModal("bankFormModal");
        refreshAllBankDependentViews();
    } catch (_error) {
        if (bankFormError) {
            bankFormError.textContent = "Erro de conexao. Tente novamente.";
        }
    }
};

const submitBankDelete = async () => {
    if (!bankDeleteCandidateId) {
        return;
    }
    if (bankDeleteError) {
        bankDeleteError.textContent = "";
    }

    const endpoint = getResourceUrl(bodyData.bankDeleteUrlTemplate, bankDeleteCandidateId);
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "X-CSRFToken": getCookie("csrftoken") },
        });
        const payload = await response.json();

        if (!response.ok || !payload.ok) {
            if (bankDeleteError) {
                bankDeleteError.textContent = collectFirstError(payload.errors || {});
            }
            return;
        }

        banks = banks.filter((bank) => bank.id !== payload.deleted_id);
        payables = payables.map((payable) =>
            payable.bank && payable.bank.id === payload.deleted_id ? { ...payable, bank: null } : payable
        );
        bankDeleteCandidateId = null;
        closeModal("bankDeleteModal");
        refreshAllBankDependentViews();
    } catch (_error) {
        if (bankDeleteError) {
            bankDeleteError.textContent = "Erro de conexao. Tente novamente.";
        }
    }
};

const buildInstallmentPaymentFormData = (statusValue) => {
    const formData = new FormData();
    formData.set("status", statusValue);
    if (statusValue !== "paid") {
        return formData;
    }
    const paymentDate = installmentPaymentDateField?.value || initialData.today;
    formData.set("payment_date", paymentDate);
    formData.set("payment_note", installmentPaymentNoteField?.value || "");
    return formData;
};

const setInstallmentStatusButtonsDisabled = (disabled) => {
    if (!installmentDetailsBody) {
        return;
    }
    installmentDetailsBody
        .querySelectorAll("[data-installment-action='toggle-status']")
        .forEach((button) => {
            button.disabled = disabled;
        });
};

const submitInstallmentStatusUpdate = async (payableId, nextStatus, triggerButton = null) => {
    const endpoint = getResourceUrl(bodyData.payableStatusUrlTemplate, payableId);
    const formData = buildInstallmentPaymentFormData(nextStatus);
    if (installmentBulkError) {
        installmentBulkError.textContent = "";
    }
    setInstallmentStatusButtonsDisabled(true);

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "X-CSRFToken": getCookie("csrftoken") },
            body: formData,
        });
        const payload = await response.json();

        if (!response.ok || !payload.ok) {
            if (installmentBulkError) {
                installmentBulkError.textContent = collectFirstError(payload.errors || {});
            }
            return;
        }

        triggerSuccessFeedback(triggerButton);
        mergeUpdatedPayables([payload.payable]);
        refreshPayables();

        if (nextStatus === "paid" && !payload.payable.payment_receipt_url) {
            openReceiptPromptModal(payableId);
        } else if (nextStatus !== "paid" && receiptUploadInstallmentId === payableId) {
            closeModal("receiptUploadModal");
        }
    } catch (_error) {
        if (installmentBulkError) {
            installmentBulkError.textContent = "Erro de conexao. Tente novamente.";
        }
    } finally {
        setInstallmentStatusButtonsDisabled(false);
    }
};

const submitInstallmentReceiptUpload = async () => {
    if (!bodyData.payableReceiptUploadUrlTemplate) {
        return;
    }
    const payableId = receiptUploadInstallmentId;
    if (!payableId) {
        return;
    }
    const installment = getPayableById(payableId);
    if (!installment || installment.status !== "paid") {
        if (receiptUploadError) {
            receiptUploadError.textContent = "Marque a parcela como paga antes de anexar comprovante.";
        }
        return;
    }

    const receiptFile = receiptFileField?.files?.[0] || null;
    if (!receiptFile) {
        if (receiptUploadError) {
            receiptUploadError.textContent = "Selecione um arquivo antes de anexar.";
        }
        return;
    }
    if (receiptUploadError) {
        receiptUploadError.textContent = "";
    }
    if (receiptUploadSubmitBtn) {
        receiptUploadSubmitBtn.disabled = true;
    }

    const endpoint = getResourceUrl(bodyData.payableReceiptUploadUrlTemplate, payableId);
    const formData = new FormData();
    formData.set("receipt", receiptFile);

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "X-CSRFToken": getCookie("csrftoken") },
            body: formData,
        });
        const payload = await response.json();

        if (!response.ok || !payload.ok) {
            if (receiptUploadError) {
                receiptUploadError.textContent = collectFirstError(payload.errors || {});
            }
            return;
        }

        triggerSuccessFeedback(receiptUploadSubmitBtn);
        mergeUpdatedPayables([payload.payable]);
        refreshPayables();
        closeModal("receiptUploadModal");
    } catch (_error) {
        if (receiptUploadError) {
            receiptUploadError.textContent = "Erro de conexao. Tente novamente.";
        }
    } finally {
        if (receiptUploadSubmitBtn) {
            receiptUploadSubmitBtn.disabled = false;
        }
    }
};

const submitInstallmentReceiptDelete = async () => {
    if (!bodyData.payableReceiptDeleteUrlTemplate) {
        return;
    }
    const payableId = receiptUploadInstallmentId;
    if (!payableId) {
        return;
    }
    if (receiptUploadError) {
        receiptUploadError.textContent = "";
    }
    if (receiptDeleteBtn) {
        receiptDeleteBtn.disabled = true;
    }

    const endpoint = getResourceUrl(bodyData.payableReceiptDeleteUrlTemplate, payableId);
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "X-CSRFToken": getCookie("csrftoken") },
        });
        const payload = await response.json();

        if (!response.ok || !payload.ok) {
            if (receiptUploadError) {
                receiptUploadError.textContent = collectFirstError(payload.errors || {});
            }
            return;
        }

        triggerSuccessFeedback(receiptDeleteBtn);
        mergeUpdatedPayables([payload.payable]);
        refreshPayables();
        const refreshedInstallment = getPayableById(payableId);
        if (receiptUploadCurrent) {
            receiptUploadCurrent.textContent = "Nenhum comprovante anexado ainda.";
        }
        renderReceiptPreview(null);
        if (receiptDeleteBtn) {
            receiptDeleteBtn.classList.add("is-hidden");
        }
        if (receiptUploadTitle && refreshedInstallment) {
            receiptUploadTitle.textContent = `Comprovante - ${getInstallmentShortLabel(refreshedInstallment)}`;
        }
    } catch (_error) {
        if (receiptUploadError) {
            receiptUploadError.textContent = "Erro de conexao. Tente novamente.";
        }
    } finally {
        if (receiptDeleteBtn) {
            receiptDeleteBtn.disabled = false;
        }
    }
};

const submitInstallmentBulkAction = async (action) => {
    if (!activeInstallmentDetailsId) {
        return;
    }
    const endpoint = getResourceUrl(bodyData.payableInstallmentBulkUrlTemplate, activeInstallmentDetailsId);
    const formData = new FormData();
    formData.set("action", action);

    if (action !== "reopen_all") {
        const paymentDate = installmentPaymentDateField?.value || initialData.today;
        formData.set("payment_date", paymentDate);
        formData.set("payment_note", installmentPaymentNoteField?.value || "");
    }
    if (action === "pay_until") {
        formData.set("until_installment", installmentBulkUntilSelect?.value || "1");
    }
    if (installmentBulkError) {
        installmentBulkError.textContent = "";
    }

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "X-CSRFToken": getCookie("csrftoken") },
            body: formData,
        });
        const payload = await response.json();

        if (!response.ok || !payload.ok) {
            if (installmentBulkError) {
                installmentBulkError.textContent = collectFirstError(payload.errors || {});
            }
            return;
        }

        mergeUpdatedPayables(payload.payables || []);
        refreshPayables();
    } catch (_error) {
        if (installmentBulkError) {
            installmentBulkError.textContent = "Erro de conexao. Tente novamente.";
        }
    }
};

const submitReportExport = async () => {
    if (
        !reportTypeFilterSelect ||
        !reportBankFilterSelect ||
        !reportFormatFilterSelect ||
        !reportDetailLevelFilterSelect ||
        !exportReportBtn
    ) {
        return;
    }
    if (reportExportError) {
        reportExportError.textContent = "";
    }

    const reportType = reportTypeFilterSelect.value || "cashflow";
    const reportBank = reportBankFilterSelect.value || "all";
    const reportFormat = reportFormatFilterSelect.value || "csv";
    const detailLevel = reportDetailLevelFilterSelect.value || "both";
    const startDate = reportStartDateFilterInput?.value || "";
    const endDate = reportEndDateFilterInput?.value || "";
    if (startDate && endDate && startDate > endDate) {
        if (reportExportError) {
            reportExportError.textContent = "Data inicial nao pode ser maior que a data final.";
        }
        return;
    }

    const params = new URLSearchParams({
        report_type: reportType,
        bank: reportBank,
        format: reportFormat,
        detail_level: detailLevel,
    });
    if (startDate) {
        params.set("start_date", startDate);
    }
    if (endDate) {
        params.set("end_date", endDate);
    }
    const endpoint = `${bodyData.reportExportUrl}?${params.toString()}`;
    const fallbackExt = reportFormat === "excel" ? "xls" : reportFormat;
    const fallbackFileName = `relatorio-${reportType}.${fallbackExt}`;

    exportReportBtn.disabled = true;
    try {
        const response = await fetch(endpoint, { method: "GET" });
        if (!response.ok) {
            let message = "Nao foi possivel exportar o relatorio.";
            try {
                const payload = await response.json();
                message = collectFirstError(payload.errors || {});
            } catch (_error) {
                // noop
            }
            if (reportExportError) {
                reportExportError.textContent = message;
            }
            return;
        }

        const blob = await response.blob();
        const fileName = extractFilenameFromDisposition(
            response.headers.get("content-disposition"),
            fallbackFileName
        );
        const blobUrl = URL.createObjectURL(blob);
        const tempLink = document.createElement("a");
        tempLink.href = blobUrl;
        tempLink.download = fileName;
        document.body.appendChild(tempLink);
        tempLink.click();
        tempLink.remove();
        URL.revokeObjectURL(blobUrl);
    } catch (_error) {
        if (reportExportError) {
            reportExportError.textContent = "Erro de conexao. Tente novamente.";
        }
    } finally {
        exportReportBtn.disabled = false;
    }
};

const initTabs = () => {
    tabMenuItems.forEach((item) => {
        const handleTabActivate = () => {
            setActiveTab(item.dataset.tab);
        };

        item.addEventListener("click", handleTabActivate);
        item.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleTabActivate();
            }
        });
    });
};

const initEvents = () => {
    if (mobileSidebarBtn) {
        mobileSidebarBtn.addEventListener("click", () => {
            toggleMobileSidebar();
        });
    }
    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener("click", () => {
            setMobileSidebarOpen(false);
        });
    }
    window.addEventListener("resize", () => {
        if (!isSidebarDrawerViewport()) {
            setMobileSidebarOpen(false);
            syncMobileSidebarUi();
            return;
        }
        syncMobileSidebarUi();
    });

    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener("click", toggleSidebarState);
    }
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", toggleThemeMode);
    }
    if (userDropdownTrigger) {
        userDropdownTrigger.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleUserDropdown();
        });
    }
    if (userDropdownMenu) {
        userDropdownMenu.addEventListener("click", (event) => {
            event.stopPropagation();
        });
    }
    document.addEventListener("click", (event) => {
        if (isSidebarDrawerViewport() && mobileSidebarOpen) {
            if (sidebarElement && mobileSidebarBtn) {
                const clickedInsideSidebar = sidebarElement.contains(event.target);
                const clickedTrigger = mobileSidebarBtn.contains(event.target);
                if (!clickedInsideSidebar && !clickedTrigger) {
                    setMobileSidebarOpen(false);
                }
            }
        }
        if (!userDropdown || !userDropdown.classList.contains("is-open")) {
            return;
        }
        if (userDropdown.contains(event.target)) {
            return;
        }
        closeUserDropdown();
    });

    if (openCreateModalBtn) {
        openCreateModalBtn.addEventListener("click", openCreateModal);
    }
    if (openEventModalBtn) {
        openEventModalBtn.addEventListener("click", () => {
            openEventCreateModal();
        });
    }
    if (openPayableModalBtn) {
        openPayableModalBtn.addEventListener("click", openPayableCreateModal);
    }
    if (openBankModalBtn) {
        openBankModalBtn.addEventListener("click", openBankCreateModal);
    }

    if (bankFilterContainer) {
        bankFilterContainer.addEventListener("click", (event) => {
            const filterButton = event.target.closest(".filter-btn");
            if (!filterButton) {
                return;
            }
            activeBankFilter = filterButton.dataset.filter;
            refreshDashboard();
        });
    }

    if (transactionSearchInput) {
        transactionSearchInput.addEventListener("input", () => {
            transactionSearchQuery = transactionSearchInput.value;
            refreshDashboard();
        });
    }

    if (transactionTypeFilterSelect) {
        transactionTypeFilterSelect.addEventListener("change", () => {
            transactionTypeFilter = transactionTypeFilterSelect.value;
            refreshDashboard();
        });
    }

    if (transactionPeriodFilterSelect) {
        transactionPeriodFilterSelect.addEventListener("change", () => {
            transactionPeriodFilter = transactionPeriodFilterSelect.value;
            refreshDashboard();
        });
    }

    if (clearTransactionFiltersBtn) {
        clearTransactionFiltersBtn.addEventListener("click", clearTransactionFilters);
    }

    if (exportReportBtn) {
        exportReportBtn.addEventListener("click", submitReportExport);
    }
    [
        reportTypeFilterSelect,
        reportBankFilterSelect,
        reportFormatFilterSelect,
        reportDetailLevelFilterSelect,
        reportStartDateFilterInput,
        reportEndDateFilterInput,
    ]
        .filter(Boolean)
        .forEach((field) => {
            field.addEventListener("change", () => {
                if (reportExportError) {
                    reportExportError.textContent = "";
                }
            });
        });

    if (eventSearchInput) {
        eventSearchInput.addEventListener("input", () => {
            eventSearchQuery = eventSearchInput.value;
            refreshEvents();
        });
    }
    if (eventStatusFilterSelect) {
        eventStatusFilterSelect.addEventListener("change", () => {
            eventStatusFilter = eventStatusFilterSelect.value;
            refreshEvents();
        });
    }
    if (eventImportanceFilterSelect) {
        eventImportanceFilterSelect.addEventListener("change", () => {
            eventImportanceFilter = eventImportanceFilterSelect.value;
            refreshEvents();
        });
    }
    if (eventViewFilterSelect) {
        eventViewFilterSelect.addEventListener("change", () => {
            eventViewMode = eventViewFilterSelect.value;
            refreshEvents();
        });
    }
    if (clearEventFiltersBtn) {
        clearEventFiltersBtn.addEventListener("click", clearEventFilters);
    }
    if (eventPrevBtn) {
        eventPrevBtn.addEventListener("click", () => {
            if (eventViewMode === "week") {
                eventCursorDate.setDate(eventCursorDate.getDate() - 7);
            } else if (eventViewMode === "month") {
                eventCursorDate.setMonth(eventCursorDate.getMonth() - 1);
            } else {
                eventCursorDate.setMonth(eventCursorDate.getMonth() - 1);
            }
            refreshEvents();
        });
    }
    if (eventNextBtn) {
        eventNextBtn.addEventListener("click", () => {
            if (eventViewMode === "week") {
                eventCursorDate.setDate(eventCursorDate.getDate() + 7);
            } else if (eventViewMode === "month") {
                eventCursorDate.setMonth(eventCursorDate.getMonth() + 1);
            } else {
                eventCursorDate.setMonth(eventCursorDate.getMonth() + 1);
            }
            refreshEvents();
        });
    }
    if (eventTodayBtn) {
        eventTodayBtn.addEventListener("click", () => {
            eventCursorDate = new Date(`${initialData.today}T00:00:00`);
            refreshEvents();
        });
    }

    if (payableSearchInput) {
        payableSearchInput.addEventListener("input", () => {
            payableSearchQuery = payableSearchInput.value;
            refreshPayables();
        });
    }

    if (payableStatusFilterSelect) {
        payableStatusFilterSelect.addEventListener("change", () => {
            payableStatusFilter = payableStatusFilterSelect.value;
            refreshPayables();
        });
    }

    if (payableTypeFilterSelect) {
        payableTypeFilterSelect.addEventListener("change", () => {
            payableTypeFilter = payableTypeFilterSelect.value;
            refreshPayables();
        });
    }

    if (payableCategoryFilterSelect) {
        payableCategoryFilterSelect.addEventListener("change", () => {
            payableCategoryFilter = payableCategoryFilterSelect.value;
            refreshPayables();
        });
    }

    if (payableBankFilterSelect) {
        payableBankFilterSelect.addEventListener("change", () => {
            payableBankFilter = payableBankFilterSelect.value;
            refreshPayables();
        });
    }

    if (payablePeriodFilterSelect) {
        payablePeriodFilterSelect.addEventListener("change", () => {
            payablePeriodFilter = payablePeriodFilterSelect.value;
            payableExactDateFilter = "";
            refreshPayables();
        });
    }

    if (clearPayableFiltersBtn) {
        clearPayableFiltersBtn.addEventListener("click", clearPayableFilters);
    }

    if (payableBulkActionField) {
        payableBulkActionField.addEventListener("change", () => {
            syncPayableBulkActionFields();
            if (payableBulkActionError) {
                payableBulkActionError.textContent = "";
            }
        });
    }
    if (applyPayableBulkActionBtn) {
        applyPayableBulkActionBtn.addEventListener("click", submitPayableBulkAction);
    }
    if (payableCategoryForm) {
        payableCategoryForm.addEventListener("submit", submitPayableCategory);
    }
    if (payableCategoryList) {
        payableCategoryList.addEventListener("click", (event) => {
            const actionButton = event.target.closest("[data-category-action='delete']");
            if (!actionButton) {
                return;
            }
            const categoryId = Number(actionButton.dataset.id);
            if (!Number.isFinite(categoryId)) {
                return;
            }
            const confirmed = window.confirm("Deseja remover esta categoria customizada?");
            if (!confirmed) {
                return;
            }
            submitPayableCategoryDelete(categoryId);
        });
    }
    if (payableCalendarPrevBtn) {
        payableCalendarPrevBtn.addEventListener("click", () => {
            payableCalendarCursorDate = new Date(
                payableCalendarCursorDate.getFullYear(),
                payableCalendarCursorDate.getMonth() - 1,
                1
            );
            renderPayableCalendar();
        });
    }
    if (payableCalendarNextBtn) {
        payableCalendarNextBtn.addEventListener("click", () => {
            payableCalendarCursorDate = new Date(
                payableCalendarCursorDate.getFullYear(),
                payableCalendarCursorDate.getMonth() + 1,
                1
            );
            renderPayableCalendar();
        });
    }
    if (payableCalendarTodayBtn) {
        payableCalendarTodayBtn.addEventListener("click", () => {
            payableCalendarCursorDate = new Date(`${initialData.today}T00:00:00`);
            payableExactDateFilter = initialData.today;
            payablePeriodFilter = "all";
            if (payablePeriodFilterSelect) {
                payablePeriodFilterSelect.value = "all";
            }
            refreshPayables();
        });
    }
    if (payableCalendarClearBtn) {
        payableCalendarClearBtn.addEventListener("click", () => {
            payableExactDateFilter = "";
            refreshPayables();
        });
    }
    if (payableCalendarGrid) {
        payableCalendarGrid.addEventListener("click", (event) => {
            const dateButton = event.target.closest("[data-calendar-date]");
            if (!dateButton) {
                return;
            }
            const isoDate = dateButton.dataset.calendarDate;
            if (!isoDate) {
                return;
            }
            payableExactDateFilter = payableExactDateFilter === isoDate ? "" : isoDate;
            payablePeriodFilter = "all";
            if (payablePeriodFilterSelect) {
                payablePeriodFilterSelect.value = "all";
            }
            refreshPayables();
        });
    }

    if (transactionsBody) {
        transactionsBody.addEventListener("click", (event) => {
            const actionButton = event.target.closest(".action-btn");
            if (!actionButton) {
                return;
            }
            const action = actionButton.dataset.action;
            const transactionId = Number(actionButton.dataset.id);
            if (action === "edit") {
                openEditModal(transactionId);
                return;
            }
            if (action === "delete") {
                deleteCandidateId = transactionId;
                openModal("deleteModal");
            }
        });
    }

    if (payablesBody) {
        payablesBody.addEventListener("click", (event) => {
            const actionButton = event.target.closest("[data-payable-action]");
            if (!actionButton) {
                return;
            }
            const action = actionButton.dataset.payableAction;
            const payableId = Number(actionButton.dataset.id);
            if (action === "details") {
                openInstallmentDetailsModal(payableId);
                return;
            }
            if (action === "edit") {
                openPayableEditModal(payableId);
                return;
            }
            if (action === "delete") {
                payableDeleteCandidateId = payableId;
                openModal("payableDeleteModal");
            }
        });
    }

    if (eventViewContainer) {
        eventViewContainer.addEventListener("click", (event) => {
            const actionElement = event.target.closest("[data-event-action='edit']");
            if (!actionElement) {
                return;
            }
            const eventId = Number(actionElement.dataset.id);
            if (!Number.isFinite(eventId)) {
                return;
            }
            openEventEditModal(eventId);
        });
    }
    if (eventReminderList) {
        eventReminderList.addEventListener("click", (event) => {
            const actionElement = event.target.closest("[data-event-action='edit']");
            if (!actionElement) {
                return;
            }
            const eventId = Number(actionElement.dataset.id);
            if (!Number.isFinite(eventId)) {
                return;
            }
            openEventEditModal(eventId);
        });
    }

    if (dashboardReconciliationList) {
        dashboardReconciliationList.addEventListener("click", (event) => {
            const actionButton = event.target.closest("[data-reconciliation-action]");
            if (!actionButton) {
                return;
            }
            const action = actionButton.dataset.reconciliationAction;
            const payableId = Number(actionButton.dataset.id);
            if (!Number.isFinite(payableId)) {
                return;
            }
            if (action === "attach-receipt") {
                openReceiptUploadModal(payableId);
                return;
            }
            if (action === "open-details") {
                openInstallmentDetailsModal(payableId);
            }
        });
    }

    if (banksBody) {
        banksBody.addEventListener("click", (event) => {
            const actionButton = event.target.closest("[data-bank-action]");
            if (!actionButton || actionButton.disabled) {
                return;
            }
            const action = actionButton.dataset.bankAction;
            const bankId = Number(actionButton.dataset.id);
            if (action === "delete") {
                bankDeleteCandidateId = bankId;
                if (bankDeleteError) {
                    bankDeleteError.textContent = "";
                }
                openModal("bankDeleteModal");
            }
        });
    }

    if (installmentDetailsBody) {
        installmentDetailsBody.addEventListener("click", (event) => {
            const actionButton = event.target.closest("[data-installment-action]");
            if (!actionButton) {
                return;
            }
            const installmentId = Number(actionButton.dataset.id);
            if (!Number.isFinite(installmentId)) {
                return;
            }
            const action = actionButton.dataset.installmentAction;
            if (action === "toggle-status") {
                const nextStatus = actionButton.dataset.status;
                submitInstallmentStatusUpdate(installmentId, nextStatus, actionButton);
                return;
            }
            if (action === "open-receipt-modal") {
                openReceiptUploadModal(installmentId);
                return;
            }
            if (action === "open-history-modal") {
                openInstallmentHistoryModal(installmentId);
            }
        });
    }

    if (receiptPromptYesBtn) {
        receiptPromptYesBtn.addEventListener("click", () => {
            if (!pendingReceiptPromptInstallmentId) {
                return;
            }
            const targetInstallmentId = pendingReceiptPromptInstallmentId;
            closeModal("receiptPromptModal");
            openReceiptUploadModal(targetInstallmentId);
        });
    }

    if (receiptUploadSubmitBtn) {
        receiptUploadSubmitBtn.addEventListener("click", submitInstallmentReceiptUpload);
    }

    if (receiptDeleteBtn) {
        receiptDeleteBtn.addEventListener("click", () => {
            const confirmed = window.confirm("Deseja excluir o comprovante desta parcela?");
            if (!confirmed) {
                return;
            }
            submitInstallmentReceiptDelete();
        });
    }

    if (receiptFileField) {
        receiptFileField.addEventListener("change", () => {
            if (receiptUploadError) {
                receiptUploadError.textContent = "";
            }
        });
    }

    if (transactionForm) {
        transactionForm.addEventListener("submit", submitTransaction);
    }
    if (eventForm) {
        eventForm.addEventListener("submit", submitEvent);
    }
    if (payableForm) {
        payableForm.addEventListener("submit", submitPayable);
    }
    if (bankForm) {
        bankForm.addEventListener("submit", submitBank);
    }
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener("click", submitDelete);
    }
    if (confirmEventDeleteBtn) {
        confirmEventDeleteBtn.addEventListener("click", submitEventDelete);
    }
    if (confirmPayableDeleteBtn) {
        confirmPayableDeleteBtn.addEventListener("click", submitPayableDelete);
    }
    if (confirmBankDeleteBtn) {
        confirmBankDeleteBtn.addEventListener("click", submitBankDelete);
    }
    if (payableTypeField) {
        payableTypeField.addEventListener("change", togglePayableConditionalFields);
    }
    if (payableAmountField) {
        payableAmountField.addEventListener("input", updateInstallmentAmountPreview);
    }
    if (payableInstallmentTotalField) {
        payableInstallmentTotalField.addEventListener("input", updateInstallmentAmountPreview);
    }
    if (payableStatusField) {
        payableStatusField.addEventListener("change", syncPayablePaymentFields);
    }
    if (installmentPayUntilBtn) {
        installmentPayUntilBtn.addEventListener("click", () => {
            submitInstallmentBulkAction("pay_until");
        });
    }
    if (installmentPayAllBtn) {
        installmentPayAllBtn.addEventListener("click", () => {
            submitInstallmentBulkAction("pay_all");
        });
    }
    if (installmentReopenAllBtn) {
        installmentReopenAllBtn.addEventListener("click", () => {
            submitInstallmentBulkAction("reopen_all");
        });
    }
    if (installmentDetailsExpandBtn) {
        installmentDetailsExpandBtn.addEventListener("click", toggleInstallmentDetailsModalExpanded);
    }
    if (eventDeleteFromFormBtn) {
        eventDeleteFromFormBtn.addEventListener("click", () => {
            const eventId = Number(eventIdField?.value || 0);
            if (!Number.isFinite(eventId) || eventId <= 0) {
                return;
            }
            eventDeleteCandidateId = eventId;
            openModal("eventDeleteModal");
        });
    }

    document.querySelectorAll("[data-close-modal]").forEach((button) => {
        button.addEventListener("click", () => {
            closeModal(button.dataset.closeModal);
        });
    });

    [
        formModal,
        deleteModal,
        eventFormModal,
        eventDeleteModal,
        payableFormModal,
        payableDeleteModal,
        installmentDetailsModal,
        receiptPromptModal,
        receiptUploadModal,
        installmentHistoryModal,
        bankFormModal,
        bankDeleteModal,
    ]
        .filter(Boolean)
        .forEach((modal) => {
            modal.addEventListener("click", (event) => {
                if (event.target === modal) {
                    closeModal(modal.id);
                }
            });
        });

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") {
            return;
        }
        closeModal("formModal");
        closeModal("deleteModal");
        closeModal("eventFormModal");
        closeModal("eventDeleteModal");
        closeModal("payableFormModal");
        closeModal("payableDeleteModal");
        closeModal("installmentDetailsModal");
        closeModal("receiptPromptModal");
        closeModal("receiptUploadModal");
        closeModal("installmentHistoryModal");
        closeModal("bankFormModal");
        closeModal("bankDeleteModal");
        closeUserDropdown();
        setMobileSidebarOpen(false);
    });
};

const init = () => {
    if (!dateField.value) {
        dateField.value = initialData.today;
    }
    if (!payableDueDateField.value) {
        payableDueDateField.value = initialData.today;
    }
    if (installmentPaymentDateField && !installmentPaymentDateField.value) {
        installmentPaymentDateField.value = initialData.today;
    }
    if (payableBulkPaymentDateField && !payableBulkPaymentDateField.value) {
        payableBulkPaymentDateField.value = initialData.today;
    }
    if (eventStartsAtField && !eventStartsAtField.value) {
        const now = new Date();
        eventStartsAtField.value = toDatetimeLocalInputValue(now.toISOString());
    }
    if (eventViewFilterSelect && eventViewFilterSelect.value) {
        eventViewMode = eventViewFilterSelect.value;
    }

    initThemeMode();
    initSidebarState();
    initDashboardDragDrop();
    initAdditionalTabsDragDrop();
    syncBankUiState();
    resetPayableCategoryForm();
    syncPayableBulkActionFields();
    syncPayablePaymentFields();
    initChart();
    initTabs();
    initEvents();
    setActiveTab(activeTab);
    refreshDashboard();
    refreshEvents();
    loadEventsFromApi();
    refreshPayables();
    refreshBanksTab();
};

init();
