export function useDirection(): "ltr" | "rtl" {
  document.documentElement.setAttribute("dir", "ltr");
  return "ltr";
}
