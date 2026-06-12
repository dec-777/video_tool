import { useState } from "react";
import MainLayout from "./layouts/MainLayout.jsx";
import HomePage from "./pages/HomePage.jsx";
import BatchPage from "./pages/BatchPage.jsx";
import PlaylistPage from "./pages/PlaylistPage.jsx";
import SubtitlePage from "./pages/SubtitlePage.jsx";
import TasksPage from "./pages/TasksPage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import { useIpcEvents } from "./hooks/useIpcEvents.js";

const pages = {
  home: HomePage,
  batch: BatchPage,
  playlist: PlaylistPage,
  subtitle: SubtitlePage,
  tasks: TasksPage,
  history: HistoryPage,
  settings: SettingsPage
};

function App() {
  const [activePage, setActivePage] = useState("home");
  const ActivePage = pages[activePage] || HomePage;
  useIpcEvents();

  return (
    <MainLayout activePage={activePage} onPageChange={setActivePage}>
      <ActivePage />
    </MainLayout>
  );
}

export default App;
