import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { Button } from "@heroui/react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components/ui";

/**
 * 子系统占位页：当前只承载标题与入口反馈，实际功能后续在各自子系统内构建。
 * 所有子系统共用这一骨架，保证切换前后的视觉语言一致。
 */
export default function SubsystemPage({
  title,
  description,
  icon: Icon = LayoutDashboard,
}: {
  title: string;
  description: string;
  icon?: typeof LayoutDashboard;
}) {
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="neon-card flex min-h-[420px] flex-col items-center justify-center rounded-2xl px-6 py-14 text-center">
        <span className="bg-brand-gradient flex size-16 items-center justify-center rounded-2xl text-white shadow-[0_10px_30px_-8px_var(--glow-purple)]">
          <Icon className="size-8" />
        </span>
        <h2 className="text-foreground mt-5 text-lg font-semibold">{title}</h2>
        <p className="text-muted mt-2 max-w-md text-sm leading-relaxed">
          该子系统功能正在建设中，敬请期待。你可以先返回主工作台处理组织、用户与平台配置。
        </p>
        <Button
          variant="primary"
          className="button--primary mt-6"
          onPress={() => navigate("/dashboard")}
        >
          <ArrowLeft className="size-4" /> 返回工作台
        </Button>
      </div>
    </>
  );
}
