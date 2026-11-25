"use client";

import { useState } from "react";

import { Alert, Avatar, Button, Card, Field, Input } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage } from "@/lib/api";
import type { Profile } from "@/lib/types";

export default function SettingsPage() {
  const { user } = useAuth();
  return user ? <SettingsForms user={user} /> : null;
}

function SettingsForms({ user }: { user: Profile }) {
  const { setUser } = useAuth();
  const [profile, setProfile] = useState({
    full_name: user.full_name,
    phone: user.phone,
    country: user.country,
  });
  const [profileMsg, setProfileMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwords, setPasswords] = useState({ current_password: "", new_password: "", confirm: "" });
  const [passwordMsg, setPasswordMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const updated = await api<Profile>("/auth/me/", { method: "PATCH", body: profile });
      setUser(updated);
      setProfileMsg({ tone: "success", text: "Profile updated." });
    } catch (err) {
      setProfileMsg({ tone: "danger", text: errorMessage(err) });
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    if (passwords.new_password !== passwords.confirm) {
      setPasswordMsg({ tone: "danger", text: "New passwords do not match." });
      return;
    }
    setSavingPassword(true);
    try {
      await api("/auth/change-password/", {
        method: "POST",
        body: { current_password: passwords.current_password, new_password: passwords.new_password },
      });
      setPasswords({ current_password: "", new_password: "", confirm: "" });
      setPasswordMsg({ tone: "success", text: "Password changed." });
    } catch (err) {
      setPasswordMsg({ tone: "danger", text: errorMessage(err) });
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <div className="mb-6 flex items-center gap-4">
          <Avatar name={user.full_name} email={user.email} src={user.avatar} size={56} />
          <div>
            <h2 className="font-semibold">{user.full_name || "Admin"}</h2>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
        </div>
        <form onSubmit={saveProfile} className="space-y-4">
          {profileMsg && <Alert tone={profileMsg.tone}>{profileMsg.text}</Alert>}
          <Field label="Full name">
            <Input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </Field>
          <Field label="Country">
            <Input value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} />
          </Field>
          <Button type="submit" loading={savingProfile}>
            Save profile
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="mb-6 font-semibold">Change password</h2>
        <form onSubmit={changePassword} className="space-y-4">
          {passwordMsg && <Alert tone={passwordMsg.tone}>{passwordMsg.text}</Alert>}
          <Field label="Current password">
            <Input
              type="password"
              autoComplete="current-password"
              value={passwords.current_password}
              onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
              required
            />
          </Field>
          <Field label="New password">
            <Input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={passwords.new_password}
              onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
              required
            />
          </Field>
          <Field label="Confirm new password">
            <Input
              type="password"
              autoComplete="new-password"
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              required
            />
          </Field>
          <Button type="submit" loading={savingPassword}>
            Update password
          </Button>
        </form>
      </Card>
    </div>
  );
}
