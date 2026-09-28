'use client';

import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { emailAPI, portfolioAPI, totpAPI, twofaAPI, userAPI } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    BadgeCheck,
    Bell,
    Camera,
    Edit,
    Eye,
    EyeOff,
    Key,
    Loader2,
    Save,
    Shield,
    ShieldAlert,
    ShieldCheck,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';

const NOTIF_LABELS = {
    priceAlerts:     { title: 'Price Alerts',     body: 'Notify when watched symbols cross your levels.' },
    portfolioUpdates:{ title: 'Portfolio Updates',body: 'Daily summary of net worth movement.' },
    marketNews:      { title: 'Market News',      body: 'Curated headlines for markets you follow.' },
    weeklyReports:   { title: 'Weekly Reports',   body: 'Performance digest delivered every Sunday.' },
};

export default function ProfilePage() {
    const { user, resetTotp, verifyResetTotp } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: apiUser } = useQuery({
        queryKey: ['profile'],
        queryFn: userAPI.getProfile,
        initialData: user,
        staleTime: 1000 * 60 * 5,
    });

    const { data: portfolioSummary } = useQuery({
        queryKey: ['portfolioSummary'],
        queryFn: portfolioAPI.getSummary,
        staleTime: 1000 * 60 * 5,
    });

    const { data: totpStatus, isLoading: totpStatusLoading } = useQuery({
        queryKey: ['totp', 'status'],
        queryFn: totpAPI.getStatus,
        staleTime: 1000 * 60,
        retry: false,
    });

    const [isEditing, setIsEditing] = useState(false);
    const [showPasswordFields, setShowPasswordFields] = useState(false);
    const [show2FAResetFlow, setShow2FAResetFlow] = useState(false);
    const [twoFAStep, setTwoFAStep] = useState('verify');
    const [currentTotpCode, setCurrentTotpCode] = useState('');
    const [useBackupForReset, setUseBackupForReset] = useState(false);
    const [newTotpCode, setNewTotpCode] = useState('');
    const [newBackupCodes, setNewBackupCodes] = useState([]);
    const [resetSetupData, setResetSetupData] = useState(null);
    const [is2FALoading, setIs2FALoading] = useState(false);
    const [isSendingRecovery, setIsSendingRecovery] = useState(false);
    const [showRecoveryConfirm, setShowRecoveryConfirm] = useState(false);

    const [profileData, setProfileData] = useState({
        name: apiUser?.name || '',
        username: apiUser?.username || '',
        email: apiUser?.email || '',
        bio: apiUser?.bio || '',
        location: apiUser?.location || '',
        phoneNumber: apiUser?.mobile || apiUser?.phoneNumber || '',
        joinDate: apiUser?.createdAt ? new Date(apiUser.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
        notifications: { priceAlerts: true, portfolioUpdates: true, marketNews: false, weeklyReports: true },
    });

    useEffect(() => {
        if (apiUser) {
            setProfileData(prev => ({
                ...prev,
                name: apiUser.name || apiUser.firstName || '',
                username: apiUser.username || '',
                email: apiUser.email || '',
                phoneNumber: apiUser.mobile || apiUser.phoneNumber || '',
                bio: apiUser.bio || '',
                location: apiUser.location || '',
                joinDate: apiUser.createdAt ? new Date(apiUser.createdAt).toLocaleDateString() : prev.joinDate,
            }));
        }
    }, [apiUser]);

    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

    const handleChange = (f, v) => setProfileData(p => ({ ...p, [f]: v }));
    const handleNotif = (f, v) => setProfileData(p => ({ ...p, notifications: { ...p.notifications, [f]: v } }));
    const handlePwd = (f, v) => setPasswords(p => ({ ...p, [f]: v }));
    const togglePwdVisibility = (f) => setShowPasswords(p => ({ ...p, [f]: !p[f] }));

    const updateProfileMutation = useMutation({
        mutationFn: (data) => userAPI.updateProfile(data),
        onSuccess: (updatedUser) => {
            queryClient.setQueryData(['profile'], updatedUser);
            toast({ title: "Profile Updated", description: "Your details were saved.", variant: "success" });
            setIsEditing(false);
        },
        onError: (e) => toast({ title: "Update Failed", description: e.message || "Failed", variant: "destructive" }),
    });

    const changePasswordMutation = useMutation({
        mutationFn: (data) => userAPI.changePassword(data.newPassword, data.currentPassword),
        onSuccess: () => {
            toast({ title: "Password Changed", description: "Your password has been updated.", variant: "success" });
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setShowPasswordFields(false);
        },
        onError: (e) => toast({ title: "Change Password Failed", description: e.message || "Failed", variant: "destructive" }),
    });

    const handleSaveProfile = async () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!profileData.email?.trim()) {
            toast({ title: "Validation", description: "Email is required", variant: "destructive" }); return;
        }
        if (!emailRegex.test(profileData.email)) {
            toast({ title: "Validation", description: "Invalid email address", variant: "destructive" }); return;
        }

        let cleanedMobile = (profileData.phoneNumber || '').replace(/^\+91/, '').replace(/\D/g, '');
        if (cleanedMobile.length > 10) cleanedMobile = cleanedMobile.slice(-10);
        if (cleanedMobile && cleanedMobile.length !== 10) {
            toast({ title: "Validation", description: "Mobile must be exactly 10 digits", variant: "destructive" }); return;
        }
        if (cleanedMobile && !/^[6-9]\d{9}$/.test(cleanedMobile)) {
            toast({ title: "Validation", description: "Invalid Indian mobile number", variant: "destructive" }); return;
        }

        const originalEmail = (apiUser?.email || '').toLowerCase().trim();
        const newEmail = profileData.email.trim().toLowerCase();
        if (newEmail !== originalEmail) {
            try {
                await emailAPI.change(newEmail);
                toast({ title: "Verification Email Sent", description: "Click the link sent to your new address.", variant: "success" });
            } catch (e) {
                toast({ title: "Email Change Failed", description: e.message || "Failed", variant: "destructive" });
                return;
            }
        }
        updateProfileMutation.mutate({
            name: profileData.name,
            bio: profileData.bio,
            location: profileData.location,
            phoneNumber: cleanedMobile || null,
        });
    };

    const handleChangePassword = async () => {
        if (!passwords.currentPassword) {
            toast({ title: "Validation", description: "Current password required", variant: "destructive" }); return;
        }
        if (passwords.newPassword.length < 8) {
            toast({ title: "Validation", description: "Must be at least 8 characters", variant: "destructive" }); return;
        }
        if (passwords.currentPassword === passwords.newPassword) {
            toast({ title: "Validation", description: "New password must differ", variant: "destructive" }); return;
        }
        if (!/[A-Z]/.test(passwords.newPassword) || !/[0-9]/.test(passwords.newPassword)) {
            toast({ title: "Validation", description: "Need uppercase and number", variant: "destructive" }); return;
        }
        if (passwords.newPassword !== passwords.confirmPassword) {
            toast({ title: "Validation", description: "Passwords do not match", variant: "destructive" }); return;
        }
        changePasswordMutation.mutate({ newPassword: passwords.newPassword, currentPassword: passwords.currentPassword });
    };

    const handleInitiate2FAReset = async () => {
        const len = useBackupForReset ? 8 : 6;
        if (!currentTotpCode || currentTotpCode.length !== len) {
            toast({ title: "Validation", description: `Enter ${useBackupForReset ? '8-digit backup' : '6-digit'} code`, variant: "destructive" }); return;
        }
        setIs2FALoading(true);
        try {
            const result = await resetTotp(currentTotpCode);
            if (result.success) {
                setResetSetupData(result.data);
                setTwoFAStep('newcode');
                setCurrentTotpCode('');
            } else {
                toast({ title: "Reset Failed", description: result.error || "Invalid code", variant: "destructive" });
            }
        } catch { toast({ title: "Error", description: "Failed to initiate 2FA reset", variant: "destructive" }); }
        finally { setIs2FALoading(false); }
    };

    const handleVerifyNew2FA = async () => {
        if (!newTotpCode || newTotpCode.length !== 6) {
            toast({ title: "Validation", description: "Enter 6-digit code", variant: "destructive" }); return;
        }
        setIs2FALoading(true);
        try {
            const result = await verifyResetTotp(newTotpCode);
            if (result.success) {
                setNewBackupCodes(result.backupCodes || []);
                setTwoFAStep('backup');
                setNewTotpCode('');
                queryClient.invalidateQueries({ queryKey: ['totp', 'status'] });
                toast({ title: "2FA Reset Complete", description: "Save your new backup codes.", variant: "success" });
            } else {
                toast({ title: "Verification Failed", description: result.error || "Invalid code", variant: "destructive" });
            }
        } catch { toast({ title: "Error", description: "Failed to verify", variant: "destructive" }); }
        finally { setIs2FALoading(false); }
    };

    const downloadNewBackupCodes = () => {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const content = `COINTRACK · BACKUP CODES\nGenerated: ${formattedDate}\n\n${newBackupCodes.map((c, i) => `[${String(i + 1).padStart(2, '0')}]  ${c}`).join('\n')}\n\nEach code is single-use. Store securely.`;
        const blob = new Blob([content], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `coinTrack_backup-codes_${apiUser?.username || 'user'}.txt`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };

    const close2FAFlow = () => {
        setShow2FAResetFlow(false); setTwoFAStep('verify'); setCurrentTotpCode('');
        setNewTotpCode(''); setNewBackupCodes([]); setResetSetupData(null); setUseBackupForReset(false);
    };

    const displayName = profileData.name || profileData.username;
    const initials = (displayName || 'U').split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

    return (
        <div className="space-y-10">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">User Profile</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage your account settings, security, and preferences.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8">
                {/* IDENTITY CARD */}
                <aside className="space-y-6">
                    <article className="bg-card border shadow-sm rounded-lg overflow-hidden overflow-hidden">
                        
                        
                        
                        

                        {/* Press tag header */}
                        <div className="bg-foreground text-background px-5 py-3 flex items-center justify-between">
                            <span className="text-[9px] tracking-[0.24em] uppercase font-mono">CoinTrack · Subscriber</span>
                            <span className="text-[9px] tracking-[0.18em] uppercase font-mono opacity-60">№ {(apiUser?.id || '0001').toString().slice(-4)}</span>
                        </div>

                        <div className="p-6 text-center">
                            <div className="relative inline-block group">
                                <div
                                    className="h-32 w-32 rounded-sm border-2 border-foreground flex items-center justify-center bg-muted relative overflow-hidden"
                                >
                                    <img
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName || 'User'}`}
                                        alt={displayName}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <button className="absolute bottom-0 right-0 bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] p-1.5 hover:scale-105 transition-transform rounded-sm">
                                    <Camera className="h-3 w-3" />
                                </button>
                            </div>

                            <h2 className="font-serif text-[26px] text-foreground mt-5 tracking-tight">
                                {displayName}
                            </h2>
                            <p className="text-[11px] text-muted-foreground mt-1 font-mono tnum tracking-wider">
                                @{profileData.username}
                            </p>

                            <div className="mt-5 pt-5 border-t border-hairline">
                                <p className="eyebrow mb-1">Issued</p>
                                <p className="text-[12px] font-mono tnum text-foreground">{profileData.joinDate}</p>
                            </div>

                            {apiUser?.isEmailVerified && (
                                <div className="mt-4 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] font-semibold text-[hsl(var(--gain))]">
                                    <BadgeCheck className="h-3 w-3" /> Verified
                                </div>
                            )}
                        </div>

                        {/* Authentic stamp */}
                        <div className="border-t border-hairline px-5 py-3 flex items-center justify-between">
                            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Authentic</span>
                            <span className="font-mono text-[10px] text-[hsl(var(--accent))] tnum">⌘ {initials}</span>
                        </div>
                    </article>

                    {/* Portfolio mini metrics */}
                    {portfolioSummary && (
                        <div className="bg-card border shadow-sm rounded-lg overflow-hidden p-5">
                            
                            
                            <p className="eyebrow-strong mb-3">At a glance</p>
                            <dl className="space-y-3">
                                <div className="flex justify-between items-baseline pb-2 border-b border-border">
                                    <dt className="eyebrow">Invested</dt>
                                    <dd className="font-mono tnum text-foreground font-medium">
                                        ₹{portfolioSummary.totalInvestedValue?.toLocaleString('en-IN') || '0'}
                                    </dd>
                                </div>
                                <div className="flex justify-between items-baseline pb-2 border-b border-border">
                                    <dt className="eyebrow">P&amp;L</dt>
                                    <dd className={cn('font-mono tnum font-medium',
                                        (portfolioSummary.totalUnrealizedPL ?? 0) >= 0 ? 'text-[hsl(var(--gain))]' : 'text-[hsl(var(--loss))]'
                                    )}>
                                        {(portfolioSummary.totalUnrealizedPL ?? 0) >= 0 ? '+' : ''}₹{portfolioSummary.totalUnrealizedPL?.toLocaleString('en-IN') || '0'}
                                    </dd>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <dt className="eyebrow">Holdings</dt>
                                    <dd className="font-mono tnum text-foreground font-medium">{portfolioSummary.holdingsList?.length || 0}</dd>
                                </div>
                            </dl>
                        </div>
                    )}
                </aside>

                {/* MAIN — Personal info, security, notifications */}
                <div className="space-y-6">
                    {/* Personal Information */}
                    <section className="bg-card border shadow-sm rounded-lg overflow-hidden">
                        
                        

                        <header className="flex items-center justify-between px-6 py-4 border-b border-hairline">
                            <div className="flex items-baseline gap-3">
                                <span className="index-num tnum">[ I ]</span>
                                <h3 className="font-serif text-[22px] text-foreground leading-none">Personal Information</h3>
                            </div>
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className={cn('ed-btn', isEditing ? 'ed-btn-ghost' : 'ed-btn-info')}
                            >
                                {isEditing ? <X className="h-3 w-3" /> : <Edit className="h-3 w-3" />}
                                {isEditing ? 'Cancel' : 'Edit Profile'}
                            </button>
                        </header>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                            <ProfileField label="Full Name" editing={isEditing} value={profileData.name} onChange={(v) => handleChange('name', v)} />
                            <ProfileField label="Username" readOnly value={profileData.username} />
                            <ProfileField
                                label="Email"
                                required
                                editing={isEditing}
                                value={profileData.email}
                                onChange={(v) => handleChange('email', v)}
                                badge={apiUser?.isEmailVerified ? 'Verified' : null}
                            />
                            <ProfileField
                                label="Mobile"
                                editing={isEditing}
                                value={profileData.phoneNumber?.replace(/^\+91/, '').replace(/\D/g, '') || ''}
                                onChange={(v) => handleChange('phoneNumber', v.replace(/\D/g, ''))}
                                displayValue={profileData.phoneNumber ? `+91 ${profileData.phoneNumber.replace(/^\+91/, '')}` : ''}
                                prefix="+91"
                                maxLength={10}
                            />
                            <ProfileField label="Location" editing={isEditing} value={profileData.location} onChange={(v) => handleChange('location', v)} />
                            <ProfileField label="Bio" editing={isEditing} value={profileData.bio} onChange={(v) => handleChange('bio', v)} className="md:col-span-2" multiline />
                        </div>

                        {isEditing && (
                            <div className="flex justify-end gap-2 px-6 py-4 border-t border-hairline">
                                <button onClick={() => setIsEditing(false)} className="ed-btn ed-btn-ghost">Cancel</button>
                                <button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending} className="ed-btn ed-btn-accent">
                                    {updateProfileMutation.isPending ? (<><Loader2 className="h-3 w-3 animate-spin" /> Saving</>) : (<><Save className="h-3 w-3" /> Save Changes</>)}
                                </button>
                            </div>
                        )}
                    </section>

                    {/* Security */}
                    <section className="bg-card border shadow-sm rounded-lg overflow-hidden">
                        
                        

                        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-b border-hairline">
                            <div className="flex items-baseline gap-3">
                                <span className="index-num tnum">[ II ]</span>
                                <h3 className="font-serif text-[22px] text-foreground leading-none">Security</h3>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    onClick={() => { setShowPasswordFields(!showPasswordFields); if (!showPasswordFields) setShow2FAResetFlow(false); }}
                                    className={cn('ed-btn', showPasswordFields ? 'ed-btn-ghost' : 'ed-btn-gain')}
                                >
                                    <Shield className="h-3 w-3" /> Change Password
                                </button>
                                <button
                                    onClick={() => { setShow2FAResetFlow(!show2FAResetFlow); if (!show2FAResetFlow) setShowPasswordFields(false); }}
                                    className={cn('ed-btn', show2FAResetFlow ? 'ed-btn-ghost' : 'ed-btn-warn')}
                                >
                                    <Key className="h-3 w-3" /> Reset 2FA
                                </button>
                            </div>
                        </header>

                        {showPasswordFields && (
                            <div className="p-6 space-y-4 border-b border-hairline">
                                {[
                                    { label: 'Current Password', field: 'currentPassword', type: 'current' },
                                    { label: 'New Password',     field: 'newPassword',     type: 'new' },
                                    { label: 'Confirm New',      field: 'confirmPassword', type: 'confirm' },
                                ].map((item) => (
                                    <div key={item.field}>
                                        <label className="block eyebrow-strong mb-2">{item.label}</label>
                                        <div className="relative">
                                            <input
                                                type={showPasswords[item.type] ? "text" : "password"}
                                                value={passwords[item.field]}
                                                onChange={(e) => handlePwd(item.field, e.target.value)}
                                                className="w-full h-10 px-3 pr-10 bg-background border border-input text-[13px] text-foreground rounded-sm focus:outline-none focus:border-[hsl(var(--accent))] font-mono"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => togglePwdVisibility(item.type)}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showPasswords[item.type] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <div className="flex justify-end gap-2 pt-2">
                                    <button onClick={() => setShowPasswordFields(false)} className="ed-btn ed-btn-ghost">Cancel</button>
                                    <button onClick={handleChangePassword} disabled={changePasswordMutation.isPending} className="ed-btn ed-btn-gain">
                                        <Shield className="h-3 w-3" />
                                        {changePasswordMutation.isPending ? 'Updating…' : 'Update Password'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {show2FAResetFlow && (
                            <div className="p-6 border-b border-hairline space-y-4">
                                {twoFAStep === 'verify' && (
                                    <>
                                        <p className="text-[12.5px] text-muted-foreground font-serif italic leading-relaxed">
                                            {useBackupForReset
                                                ? "Enter one of your backup codes to verify and reset 2FA."
                                                : "To reset 2FA, verify with your current authenticator code."}
                                        </p>
                                        <div>
                                            <label className="block eyebrow-strong mb-2">
                                                {useBackupForReset ? 'Backup Code' : 'Current 2FA Code'}
                                            </label>
                                            <input
                                                type="text"
                                                maxLength={useBackupForReset ? 8 : 6}
                                                value={currentTotpCode}
                                                onChange={(e) => setCurrentTotpCode(e.target.value.replace(/[^0-9]/g, ''))}
                                                className="w-full h-12 px-4 bg-background border border-input text-[20px] text-foreground rounded-sm focus:outline-none focus:border-[hsl(var(--accent))] font-mono tnum text-center tracking-[0.4em]"
                                                placeholder={useBackupForReset ? "00000000" : "000000"}
                                            />
                                        </div>
                                        <div className="text-center space-y-3">
                                            <button
                                                onClick={() => { setUseBackupForReset(!useBackupForReset); setCurrentTotpCode(''); }}
                                                className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[hsl(var(--accent))] hover:underline transition-colors"
                                            >
                                                {useBackupForReset ? '← Use Authenticator' : 'Lost device? Use Backup Code →'}
                                            </button>

                                            <div className="pt-3 border-t border-border">
                                                {!showRecoveryConfirm ? (
                                                    <button
                                                        onClick={() => setShowRecoveryConfirm(true)}
                                                        className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[hsl(var(--loss))] hover:underline flex items-center justify-center gap-2 mx-auto"
                                                    >
                                                        <ShieldAlert className="h-3 w-3" />
                                                        Lost everything? Recovery Link
                                                    </button>
                                                ) : (
                                                    <div className="border-l-2 border-[hsl(var(--loss))] bg-[hsl(var(--loss))]/8 p-4 text-left">
                                                        <p className="text-[11.5px] text-foreground mb-3">
                                                            Send recovery link to <span className="font-mono">{user?.email}</span>? Existing 2FA will be disabled.
                                                        </p>
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => setShowRecoveryConfirm(false)} className="ed-btn ed-btn-ghost">No</button>
                                                            <button
                                                                onClick={async () => {
                                                                    setIsSendingRecovery(true);
                                                                    try {
                                                                        await twofaAPI.requestRecovery(user.email);
                                                                        toast({ title: "Recovery Link Sent", description: "Check your email.", variant: "success" });
                                                                        close2FAFlow(); setShowRecoveryConfirm(false);
                                                                    } catch (err) {
                                                                        toast({ title: "Error", description: err.message || "Failed", variant: "destructive" });
                                                                    } finally { setIsSendingRecovery(false); }
                                                                }}
                                                                disabled={isSendingRecovery}
                                                                className="ed-btn ed-btn-loss"
                                                            >
                                                                {isSendingRecovery ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Send Recovery Link'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <button onClick={close2FAFlow} className="ed-btn ed-btn-ghost">Cancel</button>
                                            <button onClick={handleInitiate2FAReset} disabled={is2FALoading || currentTotpCode.length !== (useBackupForReset ? 8 : 6)} className="ed-btn ed-btn-warn">
                                                <Key className="h-3 w-3" />
                                                {is2FALoading ? 'Verifying…' : 'Continue Reset'}
                                            </button>
                                        </div>
                                    </>
                                )}

                                {twoFAStep === 'newcode' && resetSetupData && (
                                    <>
                                        <p className="text-[12.5px] text-muted-foreground font-serif italic leading-relaxed">
                                            Scan this QR with your authenticator, then enter the new 6-digit code.
                                        </p>
                                        {resetSetupData.qrCodeBase64 && (
                                            <div className="flex justify-center bg-white p-4 border border-border rounded-sm">
                                                <img src={resetSetupData.qrCodeBase64} alt="QR Code" className="w-40 h-40" />
                                            </div>
                                        )}
                                        {resetSetupData.secret && (
                                            <div className="text-center">
                                                <p className="eyebrow mb-1">Or enter manually</p>
                                                <code className="bg-muted px-3 py-1.5 text-[12px] font-mono text-foreground border border-border inline-block rounded-sm">{resetSetupData.secret}</code>
                                            </div>
                                        )}
                                        <div>
                                            <label className="block eyebrow-strong mb-2">New 2FA Code</label>
                                            <input
                                                type="text"
                                                maxLength={6}
                                                value={newTotpCode}
                                                onChange={(e) => setNewTotpCode(e.target.value.replace(/[^0-9]/g, ''))}
                                                className="w-full h-12 px-4 bg-background border border-input text-[20px] text-foreground rounded-sm focus:outline-none focus:border-[hsl(var(--accent))] font-mono tnum text-center tracking-[0.4em]"
                                                placeholder="000000"
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <button onClick={close2FAFlow} className="ed-btn ed-btn-ghost">Cancel</button>
                                            <button onClick={handleVerifyNew2FA} disabled={is2FALoading || newTotpCode.length !== 6} className="ed-btn ed-btn-gain">
                                                <Shield className="h-3 w-3" />
                                                {is2FALoading ? 'Verifying…' : 'Verify & Complete'}
                                            </button>
                                        </div>
                                    </>
                                )}

                                {twoFAStep === 'backup' && (
                                    <>
                                        <div className="border-l-2 border-[hsl(var(--gain))] bg-[hsl(var(--gain))]/8 p-4">
                                            <p className="text-[13px] font-semibold text-[hsl(var(--gain))]">✓ 2FA Reset Complete</p>
                                            <p className="text-[11.5px] text-foreground mt-1">Save your new backup codes — you will not see them again.</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {newBackupCodes.map((code, i) => (
                                                <div key={i} className="bg-muted border border-border px-3 py-2 text-center font-mono text-[13px] text-foreground rounded-sm tnum">
                                                    [{String(i + 1).padStart(2, '0')}] {code}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <button onClick={downloadNewBackupCodes} className="ed-btn ed-btn-info">Download Codes</button>
                                            <button onClick={close2FAFlow} className="ed-btn ed-btn-gain">Done</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* 2FA Status Panel — always visible at the bottom */}
                        <div className="p-6 border-t border-hairline">
                            <div className="flex items-baseline justify-between mb-4">
                                <div className="flex items-baseline gap-3">
                                    <span className="index-num tnum">[ II.A ]</span>
                                    <h4 className="font-serif text-[18px] text-foreground leading-none">Two-Factor Authentication</h4>
                                </div>
                                {totpStatusLoading ? (
                                    <span className="ed-pill">…</span>
                                ) : totpStatus?.enabled ? (
                                    <span className="ed-pill ed-pill-gain"><span className="live-dot" />Enabled</span>
                                ) : (
                                    <span className="ed-pill ed-pill-loss">Disabled</span>
                                )}
                            </div>

                            <p className="text-[12.5px] text-muted-foreground font-serif italic leading-relaxed mb-4">
                                Add an extra layer of security to your account using TOTP (Google Authenticator, Authy).
                            </p>

                            {totpStatusLoading ? (
                                <div className="px-5 py-4 border-l-2 border-border bg-muted/40 flex items-center gap-3">
                                    <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                                    <p className="text-[12px] text-muted-foreground">Checking 2FA status…</p>
                                </div>
                            ) : totpStatus?.enabled ? (
                                <div className="px-5 py-4 border-l-2 border-[hsl(var(--gain))] bg-[hsl(var(--gain))]/8">
                                    <div className="flex items-start gap-3">
                                        <ShieldCheck className="h-5 w-5 text-[hsl(var(--gain))] mt-0.5 flex-shrink-0" strokeWidth={2} />
                                        <div className="flex-1">
                                            <p className="text-[13px] font-semibold text-[hsl(var(--gain))] mb-1">2FA is active</p>
                                            <p className="text-[12px] text-foreground leading-relaxed">
                                                Your account is protected. You will be asked for a code when you log in.
                                            </p>
                                            {totpStatus.setupAt && (
                                                <p className="text-[10px] font-mono text-muted-foreground mt-2 tnum">
                                                    Setup on · {new Date(totpStatus.setupAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="px-5 py-4 border-l-2 border-[hsl(var(--loss))] bg-[hsl(var(--loss))]/8">
                                    <div className="flex items-start gap-3">
                                        <ShieldAlert className="h-5 w-5 text-[hsl(var(--loss))] mt-0.5 flex-shrink-0" strokeWidth={2} />
                                        <div className="flex-1">
                                            <p className="text-[13px] font-semibold text-[hsl(var(--loss))] mb-1">Action Required</p>
                                            <p className="text-[12px] text-foreground leading-relaxed">
                                                2FA is currently disabled. Enable it to secure your account.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {totpStatus?.enabled && (
                                <div className="mt-5 pt-5 border-t border-border">
                                    <p className="eyebrow-strong mb-2">Management</p>
                                    <p className="text-[11.5px] text-muted-foreground font-serif italic leading-relaxed">
                                        Resetting 2FA will generate a new secret key and invalidate all previous backup codes. Use the <span className="font-semibold not-italic text-foreground">Reset 2FA</span> button above to begin.
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Notifications */}
                    <section className="bg-card border shadow-sm rounded-lg overflow-hidden">
                        
                        

                        <header className="px-6 py-4 border-b border-hairline flex items-baseline gap-3">
                            <span className="index-num tnum">[ III ]</span>
                            <h3 className="font-serif text-[22px] text-foreground leading-none">Notifications</h3>
                            <Bell className="h-3 w-3 text-muted-foreground ml-1" />
                        </header>

                        <ul className="divide-y divide-border">
                            {Object.entries(profileData.notifications).map(([key, value]) => {
                                const meta = NOTIF_LABELS[key] || { title: key, body: '' };
                                return (
                                    <li key={key} className="flex items-center justify-between gap-4 px-6 py-4">
                                        <div>
                                            <p className="text-[13px] font-medium text-foreground tracking-tight">{meta.title}</p>
                                            <p className="text-[11.5px] text-muted-foreground font-serif italic mt-0.5">{meta.body}</p>
                                        </div>
                                        <button
                                            onClick={() => handleNotif(key, !value)}
                                            className={cn(
                                                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0',
                                                value ? 'bg-[hsl(var(--accent))]' : 'bg-muted border border-border'
                                            )}
                                            aria-pressed={value}
                                        >
                                            <span
                                                className={cn(
                                                    'inline-block h-3.5 w-3.5 rounded-full bg-background transition-transform shadow-sm',
                                                    value ? 'translate-x-[18px]' : 'translate-x-[3px]'
                                                )}
                                            />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
}

function ProfileField({ label, value, onChange, editing, readOnly, required, displayValue, prefix, maxLength, badge, className, multiline }) {
    return (
        <div className={className}>
            <div className="flex items-baseline justify-between mb-2">
                <label className="eyebrow-strong">
                    {label}
                    {required && <span className="text-[hsl(var(--loss))] ml-0.5">*</span>}
                </label>
                {badge && (
                    <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] font-semibold text-[hsl(var(--gain))]">
                        <BadgeCheck className="h-2.5 w-2.5" /> {badge}
                    </span>
                )}
            </div>
            {editing && !readOnly ? (
                multiline ? (
                    <textarea
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-background border border-input text-[13px] text-foreground rounded-sm focus:outline-none focus:border-[hsl(var(--accent))] resize-none"
                    />
                ) : (
                    <div className="relative">
                        {prefix && (
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground text-[12px] font-mono pointer-events-none">
                                {prefix}
                            </span>
                        )}
                        <input
                            type="text"
                            value={value || ''}
                            onChange={(e) => onChange(e.target.value)}
                            maxLength={maxLength}
                            className={cn(
                                'w-full h-10 pr-3 bg-background border border-input text-[13px] text-foreground rounded-sm focus:outline-none focus:border-[hsl(var(--accent))]',
                                prefix ? 'pl-11' : 'pl-3'
                            )}
                        />
                    </div>
                )
            ) : (
                <div className={cn(
                    'min-h-10 px-3 py-2 bg-muted/40 border border-border text-[13px] text-foreground rounded-sm',
                    multiline && 'min-h-[80px]'
                )}>
                    {(displayValue ?? value) || <span className="text-muted-foreground/60 italic font-serif">— Not provided —</span>}
                </div>
            )}
        </div>
    );
}
