function Topbar() {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Windows 桌面下载管理器</p>
        <h2>稳定的 video_tool 工作台</h2>
      </div>
      <div className="topbar-status">
        <span className="status-dot" aria-hidden="true" />
        本地队列待命
      </div>
    </header>
  );
}

export default Topbar;
