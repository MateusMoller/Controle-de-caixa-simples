"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status").then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (data.authenticated) return router.replace("/dashboard");
      setConfigured(data.configured);
    }).catch(error => setError(error instanceof Error ? error.message : "Não foi possível carregar o acesso."));
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(configured ? "/api/auth/login" : "/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Confira os dados e tente novamente.");
      setSubmitting(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return <main className="loginPage"><section className="loginCard">
    <div className="loginBrand"><span>c</span><b>clara fluxo</b></div>
    <p className="eyebrow">ACESSO SEGURO</p>
    <h1>{configured === false ? "Crie sua conta" : "Bem-vinda de volta"}</h1>
    <p className="loginIntro">{configured === false ? "Este é o primeiro acesso. Cadastre a conta administradora para proteger seus dados financeiros." : "Entre para acessar o dashboard e seus lançamentos."}</p>
    {configured === null && !error ? <p className="loginLoading">Verificando acesso…</p> : <form onSubmit={submit}>
      <label className="field"><span>E-mail</span><input name="email" type="email" autoComplete="email" required placeholder="seu@email.com" /></label>
      <label className="field"><span>Senha</span><input name="password" type="password" minLength={8} autoComplete={configured ? "current-password" : "new-password"} required placeholder="Mínimo de 8 caracteres" /></label>
      {error && <p className="loginError">{error}</p>}
      <button className="primary loginSubmit" disabled={submitting}>{submitting ? "Aguarde…" : configured === false ? "Criar conta e entrar" : "Entrar"}</button>
    </form>}
    <small className="loginSecurity">Sua senha é armazenada de forma protegida e nunca aparece no navegador.</small>
  </section></main>;
}
