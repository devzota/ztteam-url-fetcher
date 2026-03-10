import Link from "next/link";
import { ztteam_countByStatus, ztteam_getApiStats } from "@/lib/database";

/** Stats Card Component */
function ZTTeamStatCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  badge,
  badgeColor,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  badge: string;
  badgeColor: string;
}) {
  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 ${iconBg} rounded-lg ${iconColor}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <span
          className={`text-xs font-bold px-2 py-1 rounded-full ${badgeColor}`}
        >
          {badge}
        </span>
      </div>
      <p className="text-slate-400 text-sm font-medium mb-1">{label}</p>
      <h3 className="text-2xl font-black">{value}</h3>
    </div>
  );
}

/** Pipeline Step Component */
function ZTTeamPipelineStep({
  step,
  icon,
  label,
  count,
  href,
  color,
}: {
  step: number;
  icon: string;
  label: string;
  count: number;
  href: string;
  color: string;
}) {
  return (
    <Link href={href}>
      <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-800 hover:border-[#1337ec]/50 hover:bg-slate-800/60 transition-all cursor-pointer group">
        <div className="flex items-center gap-4">
          <div
            className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}
          >
            <span className="material-symbols-outlined text-white text-xl">
              {icon}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-400 font-medium">Bước {step}</p>
            <p className="text-sm font-bold">{label}</p>
          </div>
          <div className="text-right">
            <p
              className={`text-2xl font-black ${count > 0 ? "text-white" : "text-slate-600"}`}
            >
              {count}
            </p>
            <p className="text-xs text-slate-400">bài</p>
          </div>
          <span className="material-symbols-outlined text-slate-600 group-hover:text-[#1337ec] transition-colors">
            chevron_right
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Recent activity item */
function ZTTeamActivityItem({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <p className="text-sm text-slate-300">{label}</p>
      </div>
      <span className="text-sm font-bold">{count}</span>
    </div>
  );
}

export default function ZTTeamDashboardPage() {
  /** Fetch stats trực tiếp từ SQLite — server component */
  const stats = ztteam_countByStatus();
  const apiStats = ztteam_getApiStats();

  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  const pendingCount = stats.pending || 0;
  const processingCount = stats.processing || 0;
  const readyCount = stats.ready || 0;
  const approvedCount = stats.approved || 0;
  const rejectedCount = stats.rejected || 0;
  const doneCount = stats.done || 0;

  return (
    <div className="flex flex-col gap-8">
      {/** Header */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight mb-1">Dashboard</h2>
          <p className="text-slate-400">Tổng quan pipeline nội dung ZTTeam</p>
        </div>
        <Link
          href="/dashboard/urls"
          className="bg-[#1337ec] hover:bg-[#1337ec]/90 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Thêm URL mới
        </Link>
      </header>

      {/** Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <ZTTeamStatCard
          icon="list_alt"
          iconBg="bg-[#1337ec]/10"
          iconColor="text-[#1337ec]"
          label="Tổng bài viết"
          value={total}
          badge="All time"
          badgeColor="text-slate-400 bg-slate-800"
        />
        <ZTTeamStatCard
          icon="pending"
          iconBg="bg-amber-500/10"
          iconColor="text-amber-500"
          label="Chờ xử lý"
          value={pendingCount}
          badge="Pending"
          badgeColor="text-amber-500 bg-amber-500/10"
        />
        <ZTTeamStatCard
          icon="rate_review"
          iconBg="bg-purple-500/10"
          iconColor="text-purple-500"
          label="Chờ review"
          value={readyCount}
          badge="Ready"
          badgeColor="text-purple-500 bg-purple-500/10"
        />
        <ZTTeamStatCard
          icon="check_circle"
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-500"
          label="Hoàn thành"
          value={doneCount}
          badge="Done"
          badgeColor="text-emerald-500 bg-emerald-500/10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/** Pipeline Steps */}
        <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/30">
            <h3 className="font-bold">Pipeline Status</h3>
          </div>
          <div className="p-6 flex flex-col gap-3">
            <ZTTeamPipelineStep
              step={1}
              icon="link"
              label="URL Queue — Chờ fetch"
              count={pendingCount}
              href="/dashboard/urls"
              color="bg-amber-500"
            />
            <ZTTeamPipelineStep
              step={2}
              icon="auto_awesome"
              label="AI Generate — Chờ xử lý"
              count={pendingCount}
              href="/dashboard/generate"
              color="bg-[#1337ec]"
            />
            <ZTTeamPipelineStep
              step={3}
              icon="rate_review"
              label="Review — Chờ approve"
              count={readyCount}
              href="/dashboard/review"
              color="bg-purple-500"
            />
            <ZTTeamPipelineStep
              step={4}
              icon="movie"
              label="Video — Đã approve"
              count={approvedCount}
              href="/dashboard/video"
              color="bg-emerald-500"
            />
            <ZTTeamPipelineStep
              step={5}
              icon="done_all"
              label="Hoàn thành"
              count={doneCount}
              href="/dashboard/video"
              color="bg-slate-600"
            />
          </div>
        </div>

        {/** Status breakdown */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/30">
            <h3 className="font-bold">Trạng thái</h3>
          </div>
          <div className="p-6 divide-y divide-slate-800">
            <ZTTeamActivityItem
              label="Pending"
              count={pendingCount}
              color="bg-amber-500"
            />
            <ZTTeamActivityItem
              label="Processing"
              count={processingCount}
              color="bg-blue-500"
            />
            <ZTTeamActivityItem
              label="Ready"
              count={readyCount}
              color="bg-purple-500"
            />
            <ZTTeamActivityItem
              label="Approved"
              count={approvedCount}
              color="bg-emerald-500"
            />
            <ZTTeamActivityItem
              label="Rejected"
              count={rejectedCount}
              color="bg-red-500"
            />
            <ZTTeamActivityItem
              label="Done"
              count={doneCount}
              color="bg-slate-400"
            />
            {total === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">
                Chưa có dữ liệu
              </p>
            )}
          </div>
        </div>
      </div>
      {/** API Usage */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/30 flex items-center justify-between">
          <h3 className="font-bold">API Usage</h3>
          <span className="text-xs text-slate-500">Gemini API</span>
        </div>
        <div className="p-6 flex flex-col gap-6">
          {/** Tổng quan */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Tổng lần gọi",
                value: apiStats.total_calls,
                color: "text-white",
                icon: "api",
              },
              {
                label: "Input tokens",
                value: apiStats.total_input_tokens.toLocaleString(),
                color: "text-blue-400",
                icon: "input",
              },
              {
                label: "Output tokens",
                value: apiStats.total_output_tokens.toLocaleString(),
                color: "text-purple-400",
                icon: "output",
              },
              {
                label: "Chi phí ước tính",
                value: `$${apiStats.total_cost_usd.toFixed(4)}`,
                color: "text-emerald-400",
                icon: "payments",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-slate-800/50 rounded-xl p-4 border border-slate-700"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-slate-500 text-sm">
                    {item.icon}
                  </span>
                  <p className="text-xs text-slate-400">{item.label}</p>
                </div>
                <p className={`text-xl font-black ${item.color}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/** By model */}
          {apiStats.by_model.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Theo model
              </p>
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-800/50">
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Model
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Lần gọi
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Input
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Output
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {apiStats.by_model.map((row) => (
                      <tr
                        key={row.model}
                        className="hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-slate-300">
                          {row.model}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">
                          {row.calls}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-400">
                          {row.input_tokens.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-purple-400">
                          {row.output_tokens.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-400 font-bold">
                          ${row.cost_usd.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <span className="material-symbols-outlined text-slate-600 text-4xl">
                api
              </span>
              <p className="text-sm text-slate-500">
                Chưa có dữ liệu — Generate 1 bài để bắt đầu tracking
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
