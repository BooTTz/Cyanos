import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Check, Eye, EyeOff, LockKeyhole, Mail, Sparkles, UserRound } from "lucide-react";
import { Button, Checkbox, InputGroup, Label, Spinner, TextField } from "@heroui/react";

import { Brand } from "@/components/brand";
import { useAuth } from "@/provider";
import { useThemeMode } from "@/lib/use-theme";

function AuthAside() {
  const highlights = [
    "统一身份与权限，守护企业数据安全",
    "实时经营洞察，驱动高效业务决策",
    "灵活集成，适配各行业 toB 场景",
  ];
  return (
    <div className="bg-brand-gradient relative hidden min-h-screen flex-col justify-between overflow-hidden p-12 text-white lg:flex lg:w-[46%]">
      <div className="blob blob-purple -top-20 -left-20 size-80 bg-fuchsia-400/50" />
      <div className="blob blob-green -right-16 bottom-4 size-96 bg-emerald-300/60" />
      <div className="blob blob-green top-1/3 left-1/3 size-64 bg-cyan-300/40" />

      <div className="relative z-10">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-xl border border-white/30 bg-white/20 backdrop-blur-md">
            <svg fill="none" height="24" viewBox="0 0 24 24" width="24">
              <path d="M12 2.6 20.4 7.3v9.4L12 21.4 3.6 16.7V7.3L12 2.6Z" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.3" />
              <path d="m8.4 14.4 3.6-6 3.6 6-3.6 2-3.6-2Z" fill="white" />
            </svg>
          </span>
          <div className="leading-none">
            <p className="text-xl font-bold">Cyanos</p>
            <p className="text-[10px] tracking-[0.18em] uppercase opacity-80">platform</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-md">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur-md">
          <Sparkles className="size-3.5" /> 面向企业的数字协作平台
        </span>
        <h2 className="mt-6 text-4xl leading-tight font-bold xl:text-[46px]">
          让企业协作
          <br />
          更智能、更高效
        </h2>
        <p className="mt-4 text-base leading-relaxed text-white/85">
          一个现代化的一体化工作空间，帮你管理组织、洞察业务，让团队专注于真正重要的事。
        </p>
        <ul className="mt-8 space-y-3.5">
          {highlights.map((h) => (
            <li key={h} className="flex items-center gap-3 text-sm text-white/95">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/25">
                <Check className="size-3.5" strokeWidth={3} />
              </span>
              {h}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative z-10 text-xs text-white/60">© 2026 Cyanos. 保留所有权利。</p>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, toggleTheme } = useThemeMode();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const data = new FormData(e.currentTarget);
    const identifier = String(data.get("identifier") || "").trim();
    const password = String(data.get("password") || "");
    if (!identifier) {
      setError("请输入邮箱或手机号");
      return;
    }
    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }
    setIsLoading(true);
    try {
      const err = await login(identifier, password);
      if (err) {
        setError(err);
        return;
      }
      // 登录后由路由守卫按是否已有工作空间决定去向（有 -> dashboard，无 -> profile）
      navigate("/dashboard", { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-canvas relative flex min-h-screen">
      <button
        aria-label={theme === "light" ? "切换到深色模式" : "切换到浅色模式"}
        onClick={toggleTheme}
        className="canvas-btn fixed top-5 right-5 z-20"
      >
        {theme === "light" ? <MoonIcon /> : <SunIcon />}
      </button>

      <AuthAside />

      <div className="flex flex-1 flex-col px-6 py-8 sm:px-12 lg:px-16">
        <div className="lg:hidden">
          <Brand />
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <div className="mb-8">
            <span className="bg-accent/10 text-accent inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/20 px-3 py-1.5 text-xs font-semibold">
              <Building2 className="size-3.5" /> 企业工作台
            </span>
            <h1 className="text-foreground mt-5 text-3xl font-bold tracking-tight">欢迎回来 👋</h1>
            <p className="text-muted mt-2 text-sm">登录 Cyanos，继续管理你的企业工作空间。</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <TextField name="identifier" isRequired className="w-full">
              <Label>邮箱或手机号</Label>
              <InputGroup>
                <InputGroup.Prefix><Mail className="text-muted size-4" /></InputGroup.Prefix>
                <InputGroup.Input placeholder="name@company.com 或手机号" />
              </InputGroup>
            </TextField>

            <TextField name="password" type={showPassword ? "text" : "password"} isRequired className="w-full">
              <Label>密码</Label>
              <InputGroup>
                <InputGroup.Prefix><LockKeyhole className="text-muted size-4" /></InputGroup.Prefix>
                <InputGroup.Input placeholder="输入你的密码" />
                <InputGroup.Suffix>
                  <button
                    aria-label={showPassword ? "隐藏密码" : "显示密码"}
                    className="text-muted hover:text-foreground cursor-pointer px-1"
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </InputGroup.Suffix>
              </InputGroup>
            </TextField>

            <div className="flex items-center justify-between">
              <Checkbox name="remember" defaultSelected>
                <Checkbox.Content>
                  <Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
                  <span className="text-sm">记住我</span>
                </Checkbox.Content>
              </Checkbox>
              <a className="text-accent text-sm font-medium hover:underline" href="#forgot">忘记密码？</a>
            </div>

            {error && <p className="bg-danger/10 text-danger rounded-lg px-3 py-2 text-sm">{error}</p>}

            <Button className="w-full" isPending={isLoading} size="lg" type="submit" variant="primary">
              {({ isPending }) => (
                <>
                  {isPending ? <Spinner size="sm" color="current" /> : <ArrowRight className="size-4" />}
                  {isPending ? "登录中…" : "登录"}
                </>
              )}
            </Button>
          </form>

          <p className="text-muted mt-8 text-center text-sm">
            还没有企业账号？{" "}
            <Link className="text-accent font-semibold hover:underline" to="/register">立即注册</Link>
          </p>

          <div className="bg-accent/5 border-accent/15 mt-6 rounded-xl border px-4 py-3 text-xs leading-relaxed">
            <p><span className="text-accent font-semibold">演示账号：</span></p>
            <p className="text-muted mt-1">组织管理员 <span className="text-foreground font-medium">wechat@cyanos.cn</span> / CyanOS1120</p>
            <p className="text-muted mt-0.5">超级管理员 <span className="text-foreground font-medium">CyanAdmin</span> / CyanOS1120</p>
          </div>
        </div>

        <p className="text-muted text-center text-xs lg:text-right">
          <UserRound className="mr-1 inline size-3.5" /> 安全、可靠的企业级协作平台
        </p>
      </div>
    </div>
  );
}

function MoonIcon() {
  return (
    <svg className="size-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.5 15.9c-.2-.3-.6-.7-1.7-.5a8.4 8.4 0 0 1-1.9.1 8.4 8.4 0 0 1-5.9-2.8 8 8 0 0 1-1.4-8.6c.4-1 .1-1.5-.1-1.8-.2-.2-.8-.5-1.8-.1a10.3 10.3 0 0 0-6.3 10.2A10.5 10.5 0 0 0 10.4 20a10 10 0 0 0 2.9.6c.2 0 .3 0 .5.1a10.5 10.5 0 0 0 8.5-4.3c.6-.9.5-1.5.2-1.8Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="size-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
