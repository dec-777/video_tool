import {
  Download,
  FileText,
  History,
  Layers,
  ListVideo,
  ListChecks,
  Settings
} from "lucide-react";
import appIcon from "../assets/video-tool-icon.png";

const navItems = [
  { id: "home", label: "首页下载", icon: Download },
  { id: "batch", label: "批量下载", icon: Layers },
  { id: "playlist", label: "播放列表", icon: ListVideo },
  { id: "subtitle", label: "字幕提取", icon: FileText },
  { id: "tasks", label: "任务中心", icon: ListChecks },
  { id: "history", label: "下载历史", icon: History },
  { id: "settings", label: "设置", icon: Settings }
];

function Sidebar({ activePage, onPageChange }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <img src={appIcon} alt="" aria-hidden="true" />
        </div>
        <div>
          <h1>video_tool</h1>
          <p>视频下载工具</p>
        </div>
      </div>

      <nav className="nav-list" aria-label="主导航">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.id === activePage;

          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item${active ? " is-active" : ""}`}
              onClick={() => onPageChange(item.id)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
