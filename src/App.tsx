import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./config/firebase";
import { resolveProjectIdToSlug } from "./utils/slugResolver";
import { Auth } from "./components/Auth";
import { Home } from "./components/Home";
import { BoardList } from "./components/BoardList";
import { Board } from "./components/Board";
import { InviteJoin } from "./components/InviteJoin";
import { ProjectSettings } from "./components/ProjectSettings";
import { ProjectCreate } from "./components/ProjectCreate";
import { UserSettings } from "./components/UserSettings";
import { BoardSettings } from "./components/BoardSettings";
import { SearchBoards } from "./components/SearchBoards";
import { InitialProfileSetup } from "./components/InitialProfileSetup";
import { Layout } from "./components/Layout";
import { HeaderWrapper } from "./components/HeaderWrapper";
import { ProjectProvider, useProject } from "./contexts/ProjectContext";
import { User } from "./types";
import { getUserProfile } from "./utils/userProfile";
import { SlugRouter } from "./components/SlugRouter";
import "./App.css";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showInitialSetup, setShowInitialSetup] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user as User | null);

      // 初回ログイン時（usernameが未設定）の場合、初期設定画面を表示
      if (user) {
        try {
          const userProfile = await getUserProfile(user.uid);
          if (!userProfile || !userProfile.username) {
            setShowInitialSetup(true);
          } else {
            setShowInitialSetup(false);
          }
        } catch (error) {
          console.error("Error checking user profile:", error);
          // エラーの場合は初期設定画面を表示
          setShowInitialSetup(true);
        }
      } else {
        setShowInitialSetup(false);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Protected Route Component
  function ProtectedRoute({ children }: { children: React.ReactNode }) {
    if (loading) {
      return <div className="loading"></div>;
    }

    if (!user) {
      return <Auth user={user} />;
    }

    // 初期設定画面を表示
    if (showInitialSetup) {
      return (
        <InitialProfileSetup
          user={user}
          onComplete={() => {
            setShowInitialSetup(false);
            // ユーザー情報を再読み込み
            window.location.reload();
          }}
        />
      );
    }

    return (
      <Layout>
        <HeaderWrapper user={user} />
        {children}
      </Layout>
    );
  }

  // Home Route Component with redirect logic
  function HomeRoute() {
    const { currentProjectId } = useProject();
    const [projectSlug, setProjectSlug] = useState<string | null>(null);
    const [slugResolved, setSlugResolved] = useState(false);
    
    useEffect(() => {
      if (currentProjectId) {
        resolveProjectIdToSlug(currentProjectId)
          .then(slug => {
            setProjectSlug(slug);
            setSlugResolved(true);
          })
          .catch(() => {
            setSlugResolved(true);
          });
      } else {
        setSlugResolved(true);
      }
    }, [currentProjectId]);
    
    if (currentProjectId && slugResolved && projectSlug) {
      return <Navigate to={`/${projectSlug}`} replace />;
    }
    
    return <Home user={user!} />;
  }

  return (
    <div className="app">
      <ProjectProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/invite/:inviteCode"
              element={user ? <InviteJoin user={user} /> : <Auth user={null} />}
            />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomeRoute />
                </ProtectedRoute>
              }
            />

            <Route
              path="/project/:projectId"
              element={
                <ProtectedRoute>
                  <BoardList user={user!} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/create-project"
              element={
                <ProtectedRoute>
                  <ProjectCreate user={user!} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/project/:projectId/settings"
              element={
                <ProtectedRoute>
                  <ProjectSettings user={user!} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/project/:projectId/search"
              element={
                <ProtectedRoute>
                  <SearchBoards user={user!} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/user/settings"
              element={
                <ProtectedRoute>
                  <UserSettings user={user!} />
                </ProtectedRoute>
              }
            />


            <Route
              path="/board/:boardId/settings"
              element={
                <ProtectedRoute>
                  <BoardSettings user={user!} />
                </ProtectedRoute>
              }
            />

            {/* New slug-based routes */}
            <Route
              path="/:projectSlug/:boardName"
              element={
                <SlugRouter type="board">
                  <Layout>
                    {loading ? (
                      <div className="loading"></div>
                    ) : (
                      <>
                        {user ? (
                          <HeaderWrapper user={user} />
                        ) : (
                          <div
                            style={{
                              background: "white",
                              padding: "6px 20px",
                              borderBottom: "1px solid #e0e0e0",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              position: "fixed",
                              top: 0,
                              width: "100%",
                              zIndex: 1000,
                            }}
                          >
                            <h1 style={{ margin: 0, fontSize: "18px" }}>
                              Whiteboard
                            </h1>
                            <button
                              onClick={() => (window.location.href = "/")}
                              style={{
                                padding: "4px 16px",
                                background: "#007bff",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              ログイン
                            </button>
                          </div>
                        )}
                        <Board user={user} />
                      </>
                    )}
                  </Layout>
                </SlugRouter>
              }
            />

            <Route
              path="/:projectSlug/search"
              element={
                <ProtectedRoute>
                  <SlugRouter type="project">
                    <SearchBoards user={user!} />
                  </SlugRouter>
                </ProtectedRoute>
              }
            />

            <Route
              path="/:projectSlug"
              element={
                <ProtectedRoute>
                  <SlugRouter type="project">
                    <BoardList user={user!} />
                  </SlugRouter>
                </ProtectedRoute>
              }
            />

            {/* Legacy route for backward compatibility */}
            <Route
              path="/:boardId"
              element={
                <Layout>
                  {loading ? (
                    <div className="loading"></div>
                  ) : user ? (
                    <>
                      <HeaderWrapper user={user} />
                      <Board user={user} />
                    </>
                  ) : (
                    <div
                      style={{
                        background: "white",
                        padding: "6px 20px",
                        borderBottom: "1px solid #e0e0e0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        position: "fixed",
                        top: 0,
                        width: "100%",
                      }}
                    >
                      <h1 style={{ margin: 0, fontSize: "18px" }}>
                        Whiteboard
                      </h1>
                      <button
                        onClick={() => (window.location.href = "/")}
                        style={{
                          padding: "4px 16px",
                          background: "#007bff",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        ログイン
                      </button>
                    </div>
                  )}
                </Layout>
              }
            />

            {/* Redirect unknown routes to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ProjectProvider>
    </div>
  );
}

export default App;
