"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/app/firebase/firebaseConfig";
import {
  updatePassword,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Trash2, ShieldAlert, Loader2, ChevronRight, Key, AlertTriangle } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("password");
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isUser, setIsUser] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          setIsUser(userSnap.exists());
        } catch (error) {
          console.error("Error checking user role:", error);
          setIsUser(false);
        }
      } else {
        setIsUser(false);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const userHasPassword = () => {
    return currentUser?.providerData.some(
      (provider) => provider.providerId === "password"
    );
  };

  const handleChangePassword = async () => {
    if (!currentUser || !isUser) {
      toast.error("Unauthorized action.");
      return;
    }

    if (!userHasPassword()) {
      toast.error("Password change is not available for your login method.");
      return;
    }

    if (!currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (newPassword === currentPassword) {
      toast.error("New password cannot be the same as current.");
      return;
    }

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email!,
        currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      toast.success("Password updated successfully.");
      setNewPassword("");
      setCurrentPassword("");
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("Re-authentication failed. Incorrect password.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser || !isUser) {
      toast.error("Unauthorized action.");
      return;
    }

    if (!currentPassword && userHasPassword()) {
      toast.error("Please enter your password to confirm.");
      return;
    }

    if (deleteConfirmation.toLowerCase() !== "delete") {
      toast.error("Please type 'delete' to confirm.");
      return;
    }

    setIsDeleting(true);
    try {
      if (userHasPassword()) {
        const credential = EmailAuthProvider.credential(
          currentUser.email!,
          currentPassword
        );
        await reauthenticateWithCredential(currentUser, credential);
      }
      await deleteUser(currentUser);
      toast.success("Account deleted permanently.");
      router.push("/");
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Deletion failed. Please try again or contact support.");
    } finally {
      setIsDeleting(false);
      setCurrentPassword("");
      setDeleteConfirmation("");
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Authenticating</p>
      </div>
    );
  }

  if (!currentUser || !isUser) {
    return null;
  }

  const tabs = [
    { id: "password", label: "Security", icon: <Lock size={16} /> },
    { id: "delete", label: "Danger Zone", icon: <AlertTriangle size={16} /> },
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 lg:px-8 lg:py-16">
      <header className="mb-12">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground mb-4">Configuration</h2>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage your account security and data preferences.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? "bg-foreground text-background shadow-lg shadow-foreground/5" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                {tab.icon}
                {tab.label}
              </div>
              {activeTab === tab.id && <ChevronRight size={14} />}
            </button>
          ))}
        </aside>

        <main className="flex-1">
          <AnimatePresence mode="wait">
            {activeTab === "password" && (
              <motion.div
                key="password-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="rounded-2xl border border-border bg-background/50 backdrop-blur-sm p-8 shadow-xl shadow-foreground/5"
              >
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-foreground">Update Password</h3>
                  <p className="text-sm text-muted-foreground mt-1">Ensure your account is using a long, random password to stay secure.</p>
                </div>

                {userHasPassword() ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" title="Current Password" />
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="currentPassword"
                          type="password"
                          placeholder="Current Password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="pl-10 h-11 bg-muted/20 border-border rounded-xl"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" title="New Password" />
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="newPassword"
                          type="password"
                          placeholder="New Password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="pl-10 h-11 bg-muted/20 border-border rounded-xl"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleChangePassword}
                      disabled={loading}
                      className="w-full rounded-full bg-foreground text-background h-11 font-semibold transition-all hover:opacity-90 active:scale-95"
                    >
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                      Update Security Credentials
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-muted/30 border border-border flex items-center gap-3">
                    <ShieldAlert size={18} className="text-muted-foreground" />
                    <p className="text-sm text-muted-foreground italic">Password management is handled by your OAuth provider.</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "delete" && (
              <motion.div
                key="delete-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 shadow-xl shadow-destructive/5"
              >
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-destructive">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground mt-1">Permanently delete your account and all associated interview data.</p>
                </div>

                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-3">
                    <AlertTriangle size={18} />
                    This action is irreversible. All history will be lost.
                  </div>

                  {userHasPassword() && (
                    <div className="space-y-2">
                      <Label htmlFor="currentPasswordDelete" title="Confirm Password" />
                      <Input
                        id="currentPasswordDelete"
                        type="password"
                        placeholder="Current Password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="h-11 bg-background/50 border-destructive/20 focus-visible:ring-destructive rounded-xl"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="deleteConfirmation" title="Type 'delete' to confirm" />
                    <Input
                      id="deleteConfirmation"
                      type="text"
                      placeholder="Type 'delete'"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      className="h-11 bg-background/50 border-destructive/20 focus-visible:ring-destructive rounded-xl"
                    />
                  </div>

                  <Button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    variant="destructive"
                    className="w-full rounded-full h-11 font-semibold transition-all active:scale-95"
                  >
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Delete Account Permanently
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;
