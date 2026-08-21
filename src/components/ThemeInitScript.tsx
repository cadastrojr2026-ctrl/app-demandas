// Roda antes da hidratação para aplicar o tema salvo (ou o do sistema) sem "flash" de tela.
const SCRIPT = `
(function () {
  try {
    var salvo = localStorage.getItem("tema");
    var escuro = salvo ? salvo === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", escuro);
  } catch (e) {}
})();
`;

export function ThemeInitScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
