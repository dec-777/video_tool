import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import PageContainer from "./PageContainer.jsx";

function MainLayout({ activePage, onPageChange, children }) {
  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onPageChange={onPageChange} />
      <div className="app-main">
        <Topbar />
        <PageContainer>{children}</PageContainer>
      </div>
    </div>
  );
}

export default MainLayout;
