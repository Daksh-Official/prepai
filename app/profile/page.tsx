"use client";

import { useEffect, useState, ChangeEvent, FormEvent, useRef } from "react";
import { auth, db } from "@/app/firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { User, updateEmail, onAuthStateChanged } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User as UserIcon, Mail, Phone, MapPin, FileText, Upload, Trash2, Loader2, Edit3, X, Save } from "lucide-react";
import { toast } from "sonner";

const countryCodes = [
  { name: 'United States', dialCode: '+1', code: 'US', flag: '🇺🇸' },
  { name: 'India', dialCode: '+91', code: 'IN', flag: '🇮🇳' },
  { name: 'United Kingdom', dialCode: '+44', code: 'GB', flag: '🇬🇧' },
];

interface UserData {
  email: string;
  name: string;
  phoneNumber: string;
  countryCode: string;
  location: {
    country: string;
    state: string;
    city: string;
  };
  resumeText?: string;
  resumeFileName?: string;
}

export default function ProfilePage() {
  const [userData, setUserData] = useState<UserData>({
    email: "",
    name: "",
    phoneNumber: "",
    countryCode: "+91", 
    location: { country: "", state: "", city: "" },
    resumeText: "", 
    resumeFileName: "", 
  });
  
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isUser, setIsUser] = useState<boolean>(false);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || !isUser) return;
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data() as UserData;
          setUserData({
            email: data.email,
            name: data.name || "",
            phoneNumber: data.phoneNumber || "",
            countryCode: data.countryCode || "+91",
            location: {
              country: data.location?.country || "",
              state: data.location?.state || "",
              city: data.location?.city || "",
            },
            resumeText: data.resumeText || "", 
            resumeFileName: data.resumeFileName || "", 
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("Failed to load profile data.");
      }
    };

    if (!loading && currentUser && isUser) {
      fetchData();
    }
  }, [currentUser, router, loading, isUser]);

  const handleUpdate = async () => {
    if (!currentUser) return;

    const userRef = doc(db, "users", currentUser.uid);
    try {
      const updatePayload: Partial<UserData> = {
        name: userData.name,
        phoneNumber: userData.phoneNumber,
        countryCode: userData.countryCode,
        location: {
          country: userData.location.country,
          state: userData.location.state,
          city: userData.location.city,
        },
        resumeText: userData.resumeText,
        resumeFileName: userData.resumeFileName,
      };

      if (userData.email !== (currentUser.email || "")) {
        updatePayload.email = userData.email;
      }

      await updateDoc(userRef, updatePayload);

      if (currentUser.email !== userData.email) {
        if (userData.email.trim() !== "") {
          await updateEmail(currentUser, userData.email);
        } else {
          toast.error("Email cannot be empty.");
          return;
        }
      }

      toast.success("Profile updated successfully!");
      setIsEditing(false);
      setFile(null);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(`Error updating profile. Please try again.`);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setFile(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setUploadError(null);
    } else {
      setFile(null);
    }
  };

  const handleFileUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file || !currentUser) {
      setUploadError('Please select a file to upload.');
      return;
    }

    if (file.type !== 'application/pdf') {
      setUploadError('Please upload a valid PDF file.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        const userRef = doc(db, "users", currentUser.uid);
        
        await updateDoc(userRef, {
          resumeText: data.text,
          resumeFileName: file.name
        });

        setUserData(prev => ({ ...prev, resumeText: data.text, resumeFileName: file.name }));
        toast.success("Resume parsed and saved successfully!");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setUploadError(data.error || 'Failed to extract text from resume.');
      }
    } catch (err: any) {
      console.error('Error parsing file:', err);
      setUploadError(`Parsing failed: ${err.message || err}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = async () => {
    setFile(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (currentUser && (userData.resumeText || userData.resumeFileName)) { 
      const userRef = doc(db, "users", currentUser.uid);
      try {
        await updateDoc(userRef, {
          resumeText: "", 
          resumeFileName: "", 
        });
        setUserData(prev => ({ ...prev, resumeText: "", resumeFileName: "" })); 
        toast.success("Resume removed successfully.");
      } catch (error) {
        console.error("Error removing resume:", error);
        toast.error("Failed to remove resume.");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Syncing Profile</p>
      </div>
    );
  }

  if (!currentUser || !isUser) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 lg:px-8 lg:py-16">
      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-12">
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground mb-4">Account Settings</h2>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Your Profile</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage your identity and resume context.</p>
        </div>
        {!isEditing && (
          <Button
            onClick={handleEdit}
            className="rounded-full bg-foreground text-background px-6 py-2 h-auto text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
          >
            <Edit3 size={16} className="mr-2" />
            Edit Profile
          </Button>
        )}
      </header>

      <div className="grid grid-cols-1 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-background/50 backdrop-blur-sm p-8 shadow-xl shadow-foreground/5"
        >
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Full Name</Label>
                <div className="relative group">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={userData.name}
                    onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                    disabled={!isEditing}
                    className="pl-10 h-11 bg-muted/20 border-border focus:ring-0 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email Address</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={userData.email}
                    onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                    disabled={!isEditing}
                    className="pl-10 h-11 bg-muted/20 border-border focus:ring-0 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Phone Number</Label>
                <div className="flex gap-2">
                  <Select
                    value={userData.countryCode}
                    onValueChange={(value) => setUserData({ ...userData, countryCode: value })}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="w-[100px] h-11 bg-muted/20 border-border rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countryCodes.map((country) => (
                        <SelectItem key={country.code} value={country.dialCode}>
                          {country.flag} {country.dialCode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative flex-1 group">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={userData.phoneNumber}
                      onChange={(e) => setUserData({ ...userData, phoneNumber: e.target.value })}
                      disabled={!isEditing}
                      className="pl-10 h-11 bg-muted/20 border-border focus:ring-0 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Location</Label>
                <div className="relative group">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={`${userData.location.city}${userData.location.city ? ', ' : ''}${userData.location.state}${userData.location.state ? ', ' : ''}${userData.location.country}`}
                    onChange={(e) => {
                      const parts = e.target.value.split(', ');
                      setUserData({
                        ...userData,
                        location: {
                          city: parts[0] || "",
                          state: parts[1] || "",
                          country: parts[2] || ""
                        }
                      })
                    }}
                    disabled={!isEditing}
                    placeholder="City, State, Country"
                    className="pl-10 h-11 bg-muted/20 border-border focus:ring-0 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-border">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">AI Intelligence Resume</h3>
                  <p className="text-xs text-muted-foreground mt-1">Provided context for technical assessments.</p>
                </div>
              </div>

              {!isEditing ? (
                <div className="rounded-xl border border-border bg-muted/10 p-4">
                  {userData.resumeFileName ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{userData.resumeFileName}</p>
                          <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold">Verified Context</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4 italic">No resume context provided.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {userData.resumeFileName && (
                    <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                      <div className="flex items-center gap-3">
                        <FileText size={18} className="text-muted-foreground" />
                        <span className="text-sm font-medium">{userData.resumeFileName}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveFile}
                        className="h-8 px-3 text-destructive hover:bg-destructive/10 rounded-full"
                      >
                        <Trash2 size={14} className="mr-2" />
                        Remove
                      </Button>
                    </div>
                  )}

                  <form onSubmit={handleFileUpload} className="space-y-4">
                    <div className="relative">
                      <Input
                        id="resume-file-upload"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        className="sr-only"
                      />
                      <Label
                        htmlFor="resume-file-upload"
                        className={`flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed rounded-2xl transition-all cursor-pointer
                          ${uploading ? 'opacity-50 cursor-not-allowed' : 'border-border hover:border-foreground group'}
                        `}
                      >
                        <Upload size={24} className="text-muted-foreground group-hover:text-foreground mb-2 transition-colors" />
                        <span className="text-sm font-medium">{file ? file.name : 'Click to upload PDF resume'}</span>
                        <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">Max 5MB</span>
                      </Label>
                    </div>

                    <Button
                      type="submit"
                      disabled={!file || uploading}
                      className="w-full rounded-full bg-foreground text-background h-11 font-semibold transition-all hover:opacity-90 active:scale-95"
                    >
                      {uploading ? (
                        <>
                          <Loader2 size={18} className="mr-2 animate-spin" />
                          Processing AI Context...
                        </>
                      ) : (
                        <>
                          <FileText size={18} className="mr-2" />
                          Process and Save Resume
                        </>
                      )}
                    </Button>
                    {uploadError && <p className="text-xs text-destructive font-medium text-center">{uploadError}</p>}
                  </form>
                </div>
              )}
            </div>

            {isEditing && (
              <div className="pt-8 border-t border-border flex items-center justify-end gap-3">
                <Button
                  onClick={() => { setIsEditing(false); setFile(null); setUploadError(null); }}
                  variant="ghost"
                  className="rounded-full px-6 h-11 font-semibold"
                >
                  <X size={18} className="mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdate}
                  className="rounded-full bg-foreground text-background px-8 h-11 font-semibold transition-all hover:opacity-90 active:scale-95"
                >
                  <Save size={18} className="mr-2" />
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
