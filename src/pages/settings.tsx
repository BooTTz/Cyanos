import { Globe, Moon, Settings2, Sun } from "lucide-react";
import { Button, InputGroup, Label, Switch, TextField } from "@heroui/react";

import { PageHeader } from "@/components/ui";
import { useThemeMode } from "@/lib/use-theme";

export default function SettingsPage() {
  const { theme, setTheme } = useThemeMode();

  return (
    <div>
      <PageHeader title="偏好设置" description="自定义工作空间的通用设置与外观。" />
      <div className="grid max-w-4xl gap-5">
        <div className="neon-card rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <span className="bg-accent/12 text-accent flex size-10 items-center justify-center rounded-lg">
              <Settings2 className="size-5" />
            </span>
            <div>
              <h3 className="text-foreground font-semibold">工作空间信息</h3>
              <p className="text-muted text-xs">这些信息将展示给团队所有成员。</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <TextField name="workspace" defaultValue="Aura Workspace" className="w-full">
              <Label>工作空间名称</Label>
              <InputGroup><InputGroup.Input /></InputGroup>
            </TextField>
            <TextField name="url" defaultValue="aura-workspace" className="w-full">
              <Label>访问地址</Label>
              <InputGroup>
                <InputGroup.Prefix><Globe className="text-muted size-4" /></InputGroup.Prefix>
                <InputGroup.Input />
                <InputGroup.Suffix><span className="text-muted text-xs">.aura.dev</span></InputGroup.Suffix>
              </InputGroup>
            </TextField>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="primary">保存设置</Button>
          </div>
        </div>

        <div className="neon-card rounded-2xl p-6">
          <h3 className="text-foreground font-semibold">外观主题</h3>
          <p className="text-muted mt-1 text-xs">选择适合你的界面风格。</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setTheme("light")}
              className={`rounded-xl border-2 p-4 text-left transition-all ${theme === "light" ? "border-accent bg-accent/5" : "border-separator hover:border-muted"}`}
            >
              <span className="bg-accent/12 text-accent mb-3 flex size-9 items-center justify-center rounded-lg"><Sun className="size-5" /></span>
              <p className="text-foreground text-sm font-semibold">浅色模式</p>
              <p className="text-muted mt-1 text-xs">明亮清爽，适合白天使用。</p>
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`rounded-xl border-2 p-4 text-left transition-all ${theme === "dark" ? "border-accent bg-accent/5" : "border-separator hover:border-muted"}`}
            >
              <span className="bg-accent/12 text-accent mb-3 flex size-9 items-center justify-center rounded-lg"><Moon className="size-5" /></span>
              <p className="text-foreground text-sm font-semibold">深色模式</p>
              <p className="text-muted mt-1 text-xs">柔和护眼，适合夜间使用。</p>
            </button>
          </div>
        </div>

        <div className="neon-card rounded-2xl p-6">
          <h3 className="text-foreground font-semibold">通用</h3>
          <ul className="mt-3 divide-y divide-[var(--separator)]">
            {[
              { title: "紧凑模式", desc: "缩小界面间距，展示更多内容" },
              { title: "入门引导", desc: "重新显示新手引导教程" },
            ].map((i) => (
              <li className="flex items-center justify-between py-4" key={i.title}>
                <div><p className="text-foreground text-sm font-medium">{i.title}</p><p className="text-muted text-xs">{i.desc}</p></div>
                <Switch><Switch.Control><Switch.Thumb /></Switch.Control></Switch>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
