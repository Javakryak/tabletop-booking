export const requiredConsentDocuments = [
  {
    id: "privacy_policy",
    label: "Я принимаю политику конфиденциальности",
    href: "/rules"
  },
  {
    id: "personal_data_consent",
    label: "Я даю согласие на обработку персональных данных",
    href: "/rules"
  }
] as const;

export type RequiredConsentId = (typeof requiredConsentDocuments)[number]["id"];
