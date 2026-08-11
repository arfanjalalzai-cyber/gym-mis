export interface Language {
  label: string;
  code: string;
  dir: "ltr" | "rtl";
}

export const languages: Language[] = [
  {
    label: "English",
    code: "en",
    dir: "ltr"
  },
];
