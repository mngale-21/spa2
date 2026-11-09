// ============================================================================
// i18n
// Two languages (English / Kiswahili). No extra dependency — a plain
// dictionary + a React context. Persisted to localStorage and (once logged
// in) to the user's account via PATCH /auth/language, so the preference
// follows them across devices.
//
// Coverage: login page, the sticky sidebar, both dashboards (Cashier,
// Service Provider/"Staff"), every shared modal (register, quick-register,
// confirm payment, cancel booking), the on-hold panels, status labels, and
// every Admin management page's headers/buttons. Dynamic content that
// comes back from the server (API success/error messages, a customer's
// name, a cancellation reason someone typed) stays in whatever language it
// was written in — translating that would require the backend itself to
// be multilingual, which is a separate, larger project.
// ============================================================================

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "./api";

const DICTIONARY = {
  en: {
    // --- Login page ---------------------------------------------------------
    loginWelcomeKicker: "Welcome back",
    loginTagline: "Every branch, every room, every customer — in one place.",
    loginCardHeading: "Sign in to your account",
    loginFooterNote: "Trouble signing in? Ask your admin for a password reset.",
    forgotPasswordLink: "Forgot password?",
    forgotPasswordTitle: "Reset your password",
    forgotPasswordSubtitle: "Enter your username or email — if there's an account with an email on file, we'll send a reset link.",
    forgotPasswordIdentifierLabel: "Username or email",
    forgotPasswordSubmit: "Send reset link",
    forgotPasswordSending: "Sending…",
    forgotPasswordBackToLogin: "Back to sign in",
    resetPasswordTitle: "Set a new password",
    resetPasswordSubtitle: "Choose a new password for your account.",
    resetPasswordNewLabel: "New password",
    resetPasswordConfirmLabel: "Confirm new password",
    resetPasswordSubmit: "Reset password",
    resetPasswordResetting: "Resetting…",
    resetPasswordMismatch: "Those passwords don't match.",
    resetPasswordMissingToken: "This link is missing its reset token — use the link from your email, or request a new one.",
    resetPasswordSuccessTitle: "Password reset",
    resetPasswordGoToLogin: "Go to sign in",
    signIn: "Sign in",
    signingIn: "Signing in…",
    username: "Username",
    password: "Password",
    show: "Show",
    hide: "Hide",

    // --- Sidebar / navigation -------------------------------------------------
    roomGrid: "Room Grid",
    staffDesk: "Service Provider Desk",
    adminConsole: "Admin Console",
    overview: "Overview",
    rooms: "Rooms",
    branches: "Branches",
    employees: "Employees",
    customers: "Customers",
    services: "Services",
    payments: "Payments",
    reports: "Reports",
    changePassword: "Change password",
    language: "Language",
    signOut: "Sign out",
    fullAccess: "Full access",
    branchLevelAccess: "Branch-level access",
    greetingMorning: "Good morning",
    greetingAfternoon: "Good afternoon",
    greetingEvening: "Good evening",

    // --- Roles ---------------------------------------------------------------
    roleAdmin: "Admin",
    roleCashier: "Cashier",
    roleStaff: "Service Provider",

    // --- Status labels ---------------------------------------------------------
    available: "Available",
    busy: "Busy",
    pending: "Awaiting arrival",
    awaitingCashier: "Awaiting cashier",
    awaitingPayment: "Awaiting payment",
    busyElsewhere: "Service provider busy elsewhere",
    onHoldStatus: "On hold",
    cancelled: "Cancelled",
    completed: "Completed",
    expired: "Expired",
    delayed: "Delayed",
    maintenance: "Maintenance",

    // --- Cashier dashboard -----------------------------------------------------
    roomGridTitle: "Room grid",
    quickRegister: "+ Quick register",
    availableServicesStat: "Available services",
    inServiceStat: "In service",
    awaitingArrivalStat: "Awaiting arrival",
    onHoldStat: "On hold",
    noRoomsConfigured: "No rooms configured for this branch yet.",
    servicesOccupied: "of",
    servicesOccupiedSuffix: "services occupied",
    noServicesStaffed: "No services staffed in this room yet.",

    // --- AssignmentRow / RoomCard actions ---------------------------------------
    register: "Register",
    cancel: "Cancel",
    confirmPayment: "Confirm payment",
    endService: "End service",
    receivePayment: "Receive payment",
    additionalServiceRequested: "Additional service requested",
    delayedArrivalNotice: "Delayed — arrival not confirmed",
    busyElsewhereNote: "is currently with another customer in a different room.",

    // --- Register customer modal --------------------------------------------
    registerCustomer: "Register customer",
    customerNameLabel: "Customer name",
    phoneOptionalLabel: "Phone (optional — links repeat visits)",
    paymentSectionTitle: "Payment — a decision is required before the service can start",
    amountLabel: "Amount (TZS)",
    amountReceivedLabel: "Amount received (TZS)",
    paymentTypeLabel: "Payment type",
    cash: "Cash",
    mobileMoney: "Mobile Money",
    card: "Card",
    unpaidPayLater: "Not paid yet (pay later)",
    unpaidWarning: "This customer will be let through without paying — it will show as uncollected in Payments and Reports.",
    confirmAndStart: "Confirm & start",
    confirming: "Confirming…",
    close: "Close",
    theAssignedServiceProvider: "the assigned service provider",
    customerNameRequired: "Customer name is required.",
    tenMinCountdownNote: "A 10-minute countdown starts as soon as payment is confirmed — it stops the moment",
    tenMinCountdownNote2: "confirms the customer has arrived. If they're more than 10 minutes late, the room is released and the booking goes On-Hold.",

    // --- Quick register modal --------------------------------------------------
    quickRegisterTitle: "Quick register by service",
    serviceTaskLabel: "Service (task)",
    confirmAutoAssign: "Confirm & auto-assign",
    confirmAndRegister: "Confirm & register",
    chooseProviderLabel: "Choose a free room / provider",
    pickAProvider: "Pick a room and provider.",
    checkingWhosFree: "Checking who's free…",
    roomsFreeRightNow: "free right now:",
    firstAvailableAutoAssign: "The first available one will be assigned automatically.",
    everyoneBusyNote: "Everyone offering this service is currently busy — registering will be refused until one frees up.",
    pickAService: "Pick a service.",
    bookAhead: "Book ahead",
    remoteBookingTitle: "Book ahead for a customer",
    remoteBookingSubtitle: "For someone who already paid/ordered but isn't at the salon yet — no 10-minute countdown starts.",
    preferredProviderLabel: "Room / preferred provider",
    noProviderForService: "No room offers this service yet — ask an admin to assign one.",
    busyNowFineForLater: "busy right now — fine for later",
    remoteBookingNote: "This goes straight to the On-Hold list, reserved for this room and provider, until you check the customer in when they arrive.",
    confirmBookAhead: "Confirm & book ahead",
    bookedAheadBadge: "Booked ahead",
    reservedFor: "reserved for",
    originallyLabel: "originally",

    // --- Confirm payment modal (additional service) -----------------------------
    confirmAdditionalTitle: "Confirm payment for additional service",

    // --- Cancel booking modal -------------------------------------------------
    cancelBookingTitle: "Cancel booking",
    reasonRequiredLabel: "Reason (required)",
    refundQuestion: "This booking was already paid — refund the customer?",
    yesRefund: "Yes, refund",
    noKeepIt: "No, keep it",
    back: "Back",
    confirmCancellation: "Confirm cancellation",
    cancelling: "Cancelling…",
    reasonRequiredError: "A reason is required to cancel this booking.",
    chooseRefundError: "Choose whether to refund the payment or keep it.",

    // --- On-hold panels ----------------------------------------------------------
    onHoldCustomers: "On-hold customers",
    onHoldTitle: "On hold",
    clearHoldResume: "Clear hold — resume here",
    reassignRoom: "Reassign room",
    reassign: "Reassign",
    cancelBookingBtn: "Cancel booking",
    checkingAvailability: "Checking availability…",
    noOtherRoomFree: "No other room is free for this service right now.",
    noOneOnHold: "No one is on hold right now — every late booking has either been cleared or is still within its 10-minute window.",
    roomFreeAgain: "room is Free again",
    onHoldForMin: "On hold for",
    minSuffix: "min",

    // --- Staff / Service Provider dashboard --------------------------------
    myAssignedSessions: "My assigned sessions",
    confirmArrival: "Confirm arrival",
    markServiceFinished: "Mark service finished",
    addAnotherService: "Add another service",
    request: "Request",
    noCustomersAssigned: "No customers assigned to you right now.",
    waitingForArrival: "Waiting for customer to arrive",
    moreThanTenLate: "Room vacated by customer",
    notArrivedYet: "The customer didn't arrive within 10 minutes — the room has been released. The cashier will clear the hold when they return.",

    // --- Admin pages: headers -------------------------------------------------
    overviewTitle: "Overview",
    revenuePerBranch: "Revenue per branch",
    roomAnalyticsTitle: "Room analytics",
    onHoldCustomersTitle: "On-hold customers",
    roomsRosterTitle: "Rooms & staff roster",
    employeesByBranch: "Employees by branch",
    customersTitle: "Customers",
    serviceCatalogTitle: "Service catalog",
    paymentsTitle: "Payments",
    reportsTitle: "Reports & downloadable PDF",
    branchesTitle: "Branches",
    registerStaffCashier: "+ Register staff / cashier",
    addBranch: "+ Add branch",
    addRoom: "+ Add room",
    addService: "+ Add service",
    suspend: "Suspend",
    reactivate: "Reactivate",
    remove: "Remove",
    allBranches: "All branches",
    allStatuses: "All statuses",
    allTime: "All time",
    specificDay: "Specific day",
    downloadPdfReport: "Download PDF report",
    preparing: "Preparing…",
    notifications: "Notifications",
    clearAll: "Clear all",
    nothingYet: "Nothing yet.",
  },
  sw: {
    // --- Login page ---------------------------------------------------------
    loginWelcomeKicker: "Karibu tena",
    loginTagline: "Kila tawi, kila chumba, kila mteja — mahali pamoja.",
    loginCardHeading: "Ingia kwenye akaunti yako",
    loginFooterNote: "Una tatizo la kuingia? Muulize msimamizi wako akurekebishie nenosiri.",
    forgotPasswordLink: "Umesahau nenosiri?",
    forgotPasswordTitle: "Rekebisha nenosiri lako",
    forgotPasswordSubtitle: "Weka jina lako la mtumiaji au barua pepe — kama akaunti ipo na ina barua pepe, tutatuma kiungo cha kurekebisha.",
    forgotPasswordIdentifierLabel: "Jina la mtumiaji au barua pepe",
    forgotPasswordSubmit: "Tuma kiungo cha kurekebisha",
    forgotPasswordSending: "Inatuma…",
    forgotPasswordBackToLogin: "Rudi kuingia",
    resetPasswordTitle: "Weka nenosiri jipya",
    resetPasswordSubtitle: "Chagua nenosiri jipya kwa akaunti yako.",
    resetPasswordNewLabel: "Nenosiri jipya",
    resetPasswordConfirmLabel: "Thibitisha nenosiri jipya",
    resetPasswordSubmit: "Rekebisha nenosiri",
    resetPasswordResetting: "Inarekebisha…",
    resetPasswordMismatch: "Manenosiri hayafanani.",
    resetPasswordMissingToken: "Kiungo hiki hakina token ya kurekebisha — tumia kiungo kilichotumwa kwenye barua pepe yako, au omba kingine kipya.",
    resetPasswordSuccessTitle: "Nenosiri limerekebishwa",
    resetPasswordGoToLogin: "Nenda kuingia",
    signIn: "Ingia",
    signingIn: "Inaingia…",
    username: "Jina la mtumiaji",
    password: "Nenosiri",
    show: "Onyesha",
    hide: "Ficha",

    // --- Sidebar / navigation -------------------------------------------------
    roomGrid: "Vyumba",
    staffDesk: "Dawati la Mtoa Huduma",
    adminConsole: "Dashibodi ya Msimamizi",
    overview: "Muhtasari",
    rooms: "Vyumba",
    branches: "Matawi",
    employees: "Wafanyakazi",
    customers: "Wateja",
    services: "Huduma",
    payments: "Malipo",
    reports: "Ripoti",
    changePassword: "Badilisha nenosiri",
    language: "Lugha",
    signOut: "Toka",
    fullAccess: "Ufikiaji kamili",
    branchLevelAccess: "Ufikiaji wa tawi",
    greetingMorning: "Habari ya asubuhi",
    greetingAfternoon: "Habari ya mchana",
    greetingEvening: "Habari ya jioni",

    // --- Roles ---------------------------------------------------------------
    roleAdmin: "Msimamizi",
    roleCashier: "Mhasibu",
    roleStaff: "Mtoa Huduma",

    // --- Status labels ---------------------------------------------------------
    available: "Inapatikana",
    busy: "Inatumika",
    pending: "Inasubiri kuwasili",
    awaitingCashier: "Inasubiri mhasibu",
    awaitingPayment: "Inasubiri malipo",
    busyElsewhere: "Mtoa huduma yupo na mteja mwingine",
    onHoldStatus: "Imesimamishwa",
    cancelled: "Imefutwa",
    completed: "Imekamilika",
    expired: "Imeisha muda",
    delayed: "Imechelewa",
    maintenance: "Matengenezo",

    // --- Cashier dashboard -----------------------------------------------------
    roomGridTitle: "Ratiba ya vyumba",
    quickRegister: "+ Sajili haraka",
    availableServicesStat: "Huduma zinazopatikana",
    inServiceStat: "Zinazoendelea",
    awaitingArrivalStat: "Zinazosubiri kuwasili",
    onHoldStat: "Zilizosimamishwa",
    noRoomsConfigured: "Hakuna vyumba vilivyowekwa kwa tawi hili bado.",
    servicesOccupied: "kati ya",
    servicesOccupiedSuffix: "huduma zinatumika",
    noServicesStaffed: "Hakuna huduma zilizowekewa mtoa huduma kwenye chumba hiki bado.",

    // --- AssignmentRow / RoomCard actions ---------------------------------------
    register: "Sajili",
    cancel: "Futa",
    confirmPayment: "Thibitisha malipo",
    endService: "Maliza huduma",
    receivePayment: "Pokea malipo",
    additionalServiceRequested: "Huduma ya ziada imeombwa",
    delayedArrivalNotice: "Imechelewa — kuwasili hakujathibitishwa",
    busyElsewhereNote: "yupo na mteja mwingine kwenye chumba kingine.",

    // --- Register customer modal --------------------------------------------
    registerCustomer: "Sajili mteja",
    customerNameLabel: "Jina la mteja",
    phoneOptionalLabel: "Namba ya simu (hiari — huunganisha ziara zijazo)",
    paymentSectionTitle: "Malipo — uamuzi unahitajika kabla huduma haijaanza",
    amountLabel: "Kiasi (TZS)",
    amountReceivedLabel: "Kiasi kilichopokelewa (TZS)",
    paymentTypeLabel: "Aina ya malipo",
    cash: "Fedha taslimu",
    mobileMoney: "Pesa za simu",
    card: "Kadi",
    unpaidPayLater: "Hajalipa bado (atalipa baadaye)",
    unpaidWarning: "Mteja huyu ataruhusiwa bila kulipa — itaonekana kama pesa isiyokusanywa kwenye Malipo na Ripoti.",
    confirmAndStart: "Thibitisha & anza",
    confirming: "Inathibitisha…",
    close: "Funga",
    theAssignedServiceProvider: "mtoa huduma aliyepangiwa",
    customerNameRequired: "Jina la mteja linahitajika.",
    tenMinCountdownNote: "Muda wa dakika 10 unaanza mara malipo yanapothibitishwa — unasimama pale",
    tenMinCountdownNote2: "anapothibitisha mteja amewasili. Akichelewa zaidi ya dakika 10, chumba kinaachiwa huru na usajili unaenda On-Hold.",

    // --- Quick register modal --------------------------------------------------
    quickRegisterTitle: "Sajili haraka kwa huduma",
    serviceTaskLabel: "Huduma",
    confirmAutoAssign: "Thibitisha & panga kiotomatiki",
    confirmAndRegister: "Thibitisha & sajili",
    chooseProviderLabel: "Chagua chumba / provider aliye huru",
    pickAProvider: "Chagua chumba na provider.",
    checkingWhosFree: "Inaangalia aliye huru…",
    roomsFreeRightNow: "wako huru sasa hivi:",
    firstAvailableAutoAssign: "Wa kwanza aliye huru atapangwa kiotomatiki.",
    everyoneBusyNote: "Wote wanaotoa huduma hii wako na wateja kwa sasa — usajili utakataliwa hadi mmoja atakapopatikana.",
    pickAService: "Chagua huduma.",
    bookAhead: "Weka oda mbeleni",
    remoteBookingTitle: "Weka oda ya mteja aliye mbali",
    remoteBookingSubtitle: "Kwa mteja ambaye tayari ameshalipia/ameagiza lakini bado hajafika salon — hakuna dakika 10 za kuhesabu.",
    preferredProviderLabel: "Chumba / provider anayempenda mteja",
    noProviderForService: "Hakuna chumba kinachotoa huduma hii bado — muombe admin apange kimoja.",
    busyNowFineForLater: "ana mteja sasa — sawa kwa baadaye",
    remoteBookingNote: "Hii inaenda moja kwa moja kwenye orodha ya On-Hold, ikiwa imehifadhiwa kwa chumba na provider huyu, hadi utakapomuondolea kusimamishwa mteja atakapofika.",
    confirmBookAhead: "Thibitisha & weka oda",
    bookedAheadBadge: "Ameweka oda mapema",
    reservedFor: "imehifadhiwa kwa ajili ya",
    originallyLabel: "awali",

    // --- Confirm payment modal (additional service) -----------------------------
    confirmAdditionalTitle: "Thibitisha malipo ya huduma ya ziada",

    // --- Cancel booking modal -------------------------------------------------
    cancelBookingTitle: "Futa usajili",
    reasonRequiredLabel: "Sababu (lazima)",
    refundQuestion: "Usajili huu ulishalipiwa — urudishe pesa kwa mteja?",
    yesRefund: "Ndiyo, rudisha",
    noKeepIt: "Hapana, iachie",
    back: "Rudi",
    confirmCancellation: "Thibitisha kufuta",
    cancelling: "Inafuta…",
    reasonRequiredError: "Sababu inahitajika kufuta usajili huu.",
    chooseRefundError: "Chagua kama utarudisha pesa au kuiacha.",

    // --- On-hold panels ----------------------------------------------------------
    onHoldCustomers: "Wateja waliosimamishwa",
    onHoldTitle: "Imesimamishwa",
    clearHoldResume: "Ondoa kusimamishwa — endelea hapa",
    reassignRoom: "Panga chumba kingine",
    reassign: "Panga upya",
    cancelBookingBtn: "Futa usajili",
    checkingAvailability: "Inaangalia upatikanaji…",
    noOtherRoomFree: "Hakuna chumba kingine kilicho huru kwa huduma hii kwa sasa.",
    noOneOnHold: "Hakuna aliyesimamishwa kwa sasa — kila usajili uliochelewa ama umeshughulikiwa au bado uko ndani ya dakika 10.",
    roomFreeAgain: "chumba kiko huru tena",
    onHoldForMin: "Amesimamishwa kwa",
    minSuffix: "dakika",

    // --- Staff / Service Provider dashboard --------------------------------
    myAssignedSessions: "Vipindi vilivyonipangiwa",
    confirmArrival: "Thibitisha kuwasili",
    markServiceFinished: "Weka huduma imekamilika",
    addAnotherService: "Ongeza huduma nyingine",
    request: "Omba",
    noCustomersAssigned: "Hakuna mteja aliyekupangiwa kwa sasa.",
    waitingForArrival: "Inasubiri mteja kuwasili",
    moreThanTenLate: "Chumba kimeachwa na mteja",
    notArrivedYet: "Mteja hakufika ndani ya dakika 10 — chumba kimeachwa huru. Cashier ataondoa kusimamishwa mteja akirudi.",

    // --- Admin pages: headers -------------------------------------------------
    overviewTitle: "Muhtasari",
    revenuePerBranch: "Mapato kwa kila tawi",
    roomAnalyticsTitle: "Uchambuzi wa vyumba",
    onHoldCustomersTitle: "Wateja waliosimamishwa",
    roomsRosterTitle: "Vyumba na ratiba ya wafanyakazi",
    employeesByBranch: "Wafanyakazi kwa tawi",
    customersTitle: "Wateja",
    serviceCatalogTitle: "Orodha ya huduma",
    paymentsTitle: "Malipo",
    reportsTitle: "Ripoti na kupakua PDF",
    branchesTitle: "Matawi",
    registerStaffCashier: "+ Sajili mtoa huduma / mhasibu",
    addBranch: "+ Ongeza tawi",
    addRoom: "+ Ongeza chumba",
    addService: "+ Ongeza huduma",
    suspend: "Simamisha",
    reactivate: "Rejesha",
    remove: "Ondoa",
    allBranches: "Matawi yote",
    allStatuses: "Hali zote",
    allTime: "Muda wote",
    specificDay: "Siku maalum",
    downloadPdfReport: "Pakua ripoti ya PDF",
    preparing: "Inaandaa…",
    notifications: "Arifa",
    clearAll: "Futa zote",
    nothingYet: "Hakuna bado.",
  },
};

const LanguageContext = createContext({
  language: "en",
  t: (key) => key,
  setLanguage: () => {},
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState("en");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("salon_lang") : null;
    if (stored) setLanguageState(stored);
  }, []);

  const setLanguage = useCallback(async (lang) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") localStorage.setItem("salon_lang", lang);
    try {
      await api.patch("/auth/language", { language: lang });
    } catch {
      // Non-fatal — the local preference still applies for this device.
    }
  }, []);

  const t = useCallback((key) => DICTIONARY[language]?.[key] || DICTIONARY.en[key] || key, [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
