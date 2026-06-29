import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import CollectionEditor from "./pages/CollectionEditor";
import ProfileEditor from "./pages/ProfileEditor";
import Analytics from "./pages/Analytics";
import AdminPanel from "./pages/AdminPanel";
import PublicProfile from "./pages/PublicProfile";
import CompanyProfile from "./pages/CompanyProfile";
import CompanyBuilder from "./pages/CompanyBuilder";
import Welcome from "./pages/Welcome";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      {/* First-time onboarding after magic link login */}
      <Route path="/welcome" component={Welcome} />
      {/* Magic link verify — server handles /api/auth/magic/verify and redirects to /?magic=... */}
      <Route path="/u/:slug" component={PublicProfile} />
      <Route path="/c/:slug" component={CompanyProfile} />

      {/* Authenticated routes */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/collections/:id" component={CollectionEditor} />
      <Route path="/dashboard/profile" component={ProfileEditor} />
      <Route path="/dashboard/analytics" component={Analytics} />
      <Route path="/dashboard/analytics/:collectionId" component={Analytics} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/admin/company-builder" component={CompanyBuilder} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster
            toastOptions={{
              style: {
                background: "#000000",
                color: "#FFFFFF",
                border: "1px solid #000000",
                borderRadius: "0",
                fontFamily: "'Space Grotesk', sans-serif",
                boxShadow: "4px 4px 0px #00D26A",
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
