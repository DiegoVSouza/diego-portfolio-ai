import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Lang, State } from "./data/projects";

export const strings = {
  en: {
    skip: "Skip to content",
    nav: "Main",
    credits: "Fonts: Anton, Courier Prime, Playfair Display and Special Elite (SIL OFL). Design system: Colagem Urbana Noite.",
    keys: "Keys",
    tabHint: "Tab moves between cards; Enter opens a project.",
    brand: "AI Engineer Lab",
    thesis: "Seven independent AI projects, each shipped with its own evidence.",
    lead: "Every status below is copied from the project's own feature list. Nothing is rounded up: PENDING stays PENDING.",
    projects: "Projects",
    method: "Method",
    methodLead: "How the lab decides something is done.",
    steps: ["Intake", "Spec", "Plan", "Verify", "Gate"],
    rules: [
      ["Evidence before done", "A result needs a command, an exit code and saved output. Without it, the result is incomplete."],
      ["Numbers only from runs", "Metrics, cost and benchmarks come from recorded runs. Without a run, PENDING."],
      ["Red test is a signal", "Fix the root cause. Never delete or weaken the test to make it pass."],
      ["Authorized external effects", "No deploy, publish, push or spend beyond budget without explicit approval."],
    ],
    back: "All projects",
    version: "Version",
    repo: "Repository",
    localOnly: "Local only, not published",
    proves: "What it proves",
    limits: "Stated limits",
    source: "Source",
    features: "Features and their real status",
    colFeature: "Feature",
    colStatus: "Status",
    colEvidence: "Evidence",
    noEvidence: "No evidence path recorded",
    notFound: "Project not found.",
    lang: "Language",
    states: { verified: "verified", claimed: "claimed", partial: "partial", open: "open" } as Record<State, string>,
    of: "of",
    features_n: "features",
  },
  pt: {
    skip: "Pular para o conteúdo",
    nav: "Principal",
    credits: "Fontes: Anton, Courier Prime, Playfair Display e Special Elite (SIL OFL). Design system: Colagem Urbana Noite.",
    keys: "Teclas",
    tabHint: "Tab move entre os cartões; Enter abre um projeto.",
    brand: "AI Engineer Lab",
    thesis: "Sete projetos de IA independentes, cada um entregue com a sua evidência.",
    lead: "Cada status abaixo é copiado da lista de features do próprio projeto. Nada é arredondado para cima: PENDING continua PENDING.",
    projects: "Projetos",
    method: "Método",
    methodLead: "Como o lab decide que algo está pronto.",
    steps: ["Intake", "Spec", "Plano", "Verificação", "Gate"],
    rules: [
      ["Evidência antes de pronto", "Um resultado precisa de comando, exit code e saída salva. Sem isso, está incompleto."],
      ["Números só de execuções", "Métricas, custo e benchmarks vêm de runs registrados. Sem run, PENDING."],
      ["Teste vermelho é sinal", "Corrija a causa raiz. Nunca apague nem enfraqueça o teste para passar."],
      ["Efeitos externos autorizados", "Sem deploy, publicação, push ou gasto acima do orçamento sem aprovação explícita."],
    ],
    back: "Todos os projetos",
    version: "Versão",
    repo: "Repositório",
    localOnly: "Somente local, não publicado",
    proves: "O que demonstra",
    limits: "Limites declarados",
    source: "Fonte",
    features: "Features e o status real",
    colFeature: "Feature",
    colStatus: "Status",
    colEvidence: "Evidência",
    noEvidence: "Sem caminho de evidência registrado",
    notFound: "Projeto não encontrado.",
    lang: "Idioma",
    states: { verified: "verificado", claimed: "declarado", partial: "parcial", open: "aberto" } as Record<State, string>,
    of: "de",
    features_n: "features",
  },
};

interface Ctx {
  lang: Lang;
  t: (typeof strings)["en"];
  setLang: (lang: Lang) => void;
}
const LangContext = createContext<Ctx | null>(null);

function initial(): Lang {
  try {
    const saved = localStorage.getItem("p07-lang");
    if (saved === "en" || saved === "pt") return saved;
  } catch {
    /* storage can be blocked; fall through */
  }
  return typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("pt") ? "pt" : "en";
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initial);
  useEffect(() => {
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
    try {
      localStorage.setItem("p07-lang", lang);
    } catch {
      /* ignore */
    }
  }, [lang]);
  return <LangContext.Provider value={{ lang, t: strings[lang], setLang }}>{children}</LangContext.Provider>;
}

export function useLang(): Ctx {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang needs LangProvider");
  return ctx;
}
