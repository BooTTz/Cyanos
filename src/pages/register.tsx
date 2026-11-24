import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Check, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Smartphone, Sparkles, UserRound } from "lucide-react";
import { Button, Checkbox, InputGroup, Label, Spinner, TextField } from "@heroui/react";

import { Brand } from "@/components/brand";
import { useAuth } from "@/provider";
import { useThemeMode } from "@/lib/use-theme";
import { verification } from "@/lib/tenant-store";

type Channel = "email" | "phone";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { theme, toggleTheme } = useThemeMode();
  const [channel, setChannel] = useState<Channel>("email");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sentCode, setSentCode] = useState("");

  const readAccount = () => String((document.querySelector('input[name="account"]') as HTMLInputElement)?.value || "").trim();

  const sendCode = async () => {
    const dest = channel === "email" ? readAccount().toLowerCase() : readAccount();
    if (!dest || (channel === "email" ? !dest.includes("@") : !/^\d{6,}$/.test(dest))) {
      setError(channel === "email" ? "请先填写有效邮箱" : "请先填写有效手机号");
      return;
    }
    setError("");
    setSentCode(await verification.send(dest));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") || "").trim();
    const account = readAccount();
    const password = String(data.get("password") || "");
    const code = String(data.get("code") || "").trim();
    const dest = channel === "email" ? account.toLowerCase() : account;
    if (name.length < 2) return setError("请输入你的姓名（至少 2 个字）");
    if (channel === "email" ? !dest.includes("@") : !/^\d{6,}$/.test(dest)) return setError(channel === "email" ? "请输入有效邮箱" : "请输入有效手机号");
    if (password.length < 6) return setError("密码至少 6 位");
    if (!sentCode) return setError("请先获取验证码");
    if (!verification.verify(dest, code)) return setError("验证码错误或已过期");

    setIsLoading(true);
    try {
      const err = await register({ name, email: channel === "email" ? account : "", phone: channel === "phone" ? account : "", password, code });
      if (err) setError(err);
      else navigate("/profile", { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-canvas relative flex min-h-screen overflow-hidden">
      <div className="blob blob-purple -top-32 -left-24 size-[420px] bg-purple-400/30 dark:bg-purple-600/25" />
      <div className="blob blob-green -right-24 bottom-0 size-[380px] bg-emerald-400/30 dark:bg-emerald-600/20" />

      <button
        aria-label={theme === "light" ? "切换到深色模式" : "切换到浅色模式"}
        onClick={toggleTheme}
        className="canvas-btn fixed top-5 right-5 z-20"
      >
        {theme === "light" ? (
          <svg className="size-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.5 15.9c-.2-.3-.6-.7-1.7-.5a8.4 8.4 0 0 1-1.9.1 8.4 8.4 0 0 1-5.9-2.8 8 8 0 0 1-1.4-8.6c.4-1 .1-1.5-.1-1.8-.2-.2-.8-.5-1.8-.1a10.3 10.3 0 0 0-6.3 10.2A10.5 10.5 0 0 0 10.4 20a10 10 0 0 0 2.9.6c.2 0 .3 0 .5.1a10.5 10.5 0 0 0 8.5-4.3c.6-.9.5-1.5.2-1.8Z" /></svg>
        ) : (
          <svg className="size-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        )}
      </button>

      <div className="relative z-10 mx-auto flex w-full max-w-[460px] flex-col justify-center px-6 py-10">
        <div className="mb-8 flex justify-center"><Brand /></div>

        <div className="glass rounded-3xl p-7 shadow-xl sm:p-9">
          <span className="bg-accent/10 text-accent inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold">
            <Sparkles className="size-3.5" /> 企业版免费试用
          </span>
          <h1 className="text-foreground mt-5 text-2xl font-bold tracking-tight">创建企业账户</h1>
          <p className="text-muted mt-2 text-sm">注册后可创建或加入组织，开启团队协作。</p>

          <div className="bg-default mt-5 grid grid-cols-2 gap-1 rounded-xl p-1">
            {(["email", "phone"] as Channel[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { setChannel(c); setSentCode(""); setError(""); }}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors ${
                  channel === c ? "bg-accent/12 text-accent" : "text-muted hover:text-foreground"
                }`}
              >
                {c === "email" ? <Mail className="size-4" /> : <Smartphone className="size-4" />}
                {c === "email" ? "邮箱注册" : "手机注册"}
              </button>
            ))}
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <TextField name="name" isRequired className="w-full">
              <Label>姓名</Label>
              <InputGroup>
                <InputGroup.Prefix><UserRound className="text-muted size-4" /></InputGroup.Prefix>
                <InputGroup.Input placeholder="你的名字" />
              </InputGroup>
            </TextField>

            <TextField isRequired className="w-full">
              <Label>{channel === "email" ? "企业邮箱" : "手机号"}</Label>
              <InputGroup>
                <InputGroup.Prefix>{channel === "email" ? <Mail className="text-muted size-4" /> : <Smartphone className="text-muted size-4" />}</InputGroup.Prefix>
                <InputGroup.Input
                  name="account"
                  type={channel === "email" ? "email" : "tel"}
                  placeholder={channel === "email" ? "name@company.com" : "11 位手机号"}
                />
              </InputGroup>
            </TextField>

            <TextField name="password" type={showPassword ? "text" : "password"} isRequired className="w-full">
              <Label>密码</Label>
              <InputGroup>
                <InputGroup.Prefix><LockKeyhole className="text-muted size-4" /></InputGroup.Prefix>
                <InputGroup.Input placeholder="至少 6 位字符" />
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

            <div>
              <Label>验证码</Label>
              <div className="mt-1 flex gap-2">
                <InputGroup className="flex-1">
                  <InputGroup.Prefix><ShieldCheck className="text-muted size-4" /></InputGroup.Prefix>
                  <InputGroup.Input name="code" placeholder="6 位验证码" />
                </InputGroup>
                <Button type="button" variant="outline" onPress={sendCode} className="shrink-0">获取验证码</Button>
              </div>
              {sentCode && (
                <p className="bg-accent/8 text-accent mt-2 rounded-lg px-3 py-2 text-xs">
                  演示验证码：<span className="font-bold tracking-widest">{sentCode}</span>（5 分钟内有效，不真实发送）
                </p>
              )}
            </div>

            <Checkbox name="terms" defaultSelected>
              <Checkbox.Content>
                <Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
                <span className="text-muted text-xs leading-relaxed">
                  我已阅读并同意 <a className="text-accent font-medium" href="#terms">服务条款</a> 与{" "}
                  <a className="text-accent font-medium" href="#privacy">隐私政策</a>
                </span>
              </Checkbox.Content>
            </Checkbox>

            {error && <p className="bg-danger/10 text-danger rounded-lg px-3 py-2 text-sm">{error}</p>}

            <Button className="w-full" isPending={isLoading} size="lg" type="submit" variant="primary">
              {({ isPending }) => (
                <>
                  {isPending ? <Spinner size="sm" color="current" /> : <ArrowRight className="size-4" />}
                  {isPending ? "创建中…" : "创建账户"}
                </>
              )}
            </Button>
          </form>

          <ul className="text-muted mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
            {["无需信用卡", "随时可取消", "数据加密存储", "7×24 支持"].map((t) => (
              <li key={t} className="flex items-center gap-1.5"><Check className="text-success size-3.5" /> {t}</li>
            ))}
          </ul>
        </div>

        <p className="text-muted mt-6 text-center text-sm">
          已经有企业账号？ <Link className="text-accent font-semibold hover:underline" to="/login">返回登录</Link>
        </p>
        <p className="text-muted mt-2 flex items-center justify-center gap-1.5 text-center text-xs">
          <Building2 className="size-3.5" /> 专为各行业企业打造的一体化平台
        </p>
      </div>
    </div>
  );
}
