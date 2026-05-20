import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../../context/AppContext';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Checkbox } from '../../../components/ui/checkbox';
import { toast } from 'sonner';
import { Wallet } from 'lucide-react';

export function LoginPage() {
    const { login, signup } = useApp();
    const navigate = useNavigate();

    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [signupName, setSignupName] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [signupIsOrgAccount, setSignupIsOrgAccount] = useState(false);
    const [signupOrgName, setSignupOrgName] = useState('');
    const [signupOrgDescription, setSignupOrgDescription] = useState('');
    const [loginInlineError, setLoginInlineError] = useState('');
    const [signupInlineError, setSignupInlineError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginInlineError('');

        try {
            await login(loginEmail, loginPassword);
            toast.success('Login successful!');
            navigate('/');
        } catch (error) {
            const message = error?.message || 'Login failed';
            setLoginInlineError(message);
            toast.error(message);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setSignupInlineError('');

        if (!signupName || !signupEmail || !signupPassword) {
            setSignupInlineError('Please fill in all fields');
            toast.error('Please fill in all fields');
            return;
        }

        if (signupIsOrgAccount && (!signupOrgName)) {
            setSignupInlineError('Please enter organization name');
            toast.error('Please enter organization name');
            return;
        }

        try {
            const signupData = {
                name: signupName,
                email: signupEmail,
                password: signupPassword,
            };

            if (signupIsOrgAccount) {
                signupData.isOrgAccount = true;
                signupData.organizationName = signupOrgName;
                signupData.organizationDescription = signupOrgDescription;
            }

            await signup(signupData);
            toast.success('Account created successfully!');
            navigate('/');
        } catch (error) {
            const message = error?.message || 'Signup failed';
            setSignupInlineError(message);
            toast.error(message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground mb-4">
                        <Wallet className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold">ExpenseTracker</h1>
                    <p className="text-muted-foreground mt-2">Manage your personal and business expenses</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Welcome</CardTitle>
                        <CardDescription>Sign in to your account or create a new one</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <Tabs defaultValue="login" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="login">Login</TabsTrigger>
                                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                            </TabsList>

                            <TabsContent value="login">
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="login-email">Email</Label>
                                        <Input
                                            id="login-email"
                                            type="email"
                                            placeholder="john@example.com"
                                            value={loginEmail}
                                            onChange={(e) => setLoginEmail(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="login-password">Password</Label>
                                        <Input
                                            id="login-password"
                                            type="password"
                                            placeholder="********"
                                            value={loginPassword}
                                            onChange={(e) => setLoginPassword(e.target.value)}
                                            required
                                        />
                                    </div>

                                    {loginInlineError && (
                                        <p className="text-xs text-destructive" role="alert">
                                            {loginInlineError}
                                        </p>
                                    )}

                                    <Button type="submit" className="w-full">
                                        Sign In
                                    </Button>

                                    <p className="text-xs text-center text-muted-foreground">
                                        Demo: john@example.com / password
                                    </p>
                                </form>
                            </TabsContent>

                            <TabsContent value="signup">
                                <form onSubmit={handleSignup} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="signup-name">Full Name</Label>
                                        <Input
                                            id="signup-name"
                                            type="text"
                                            placeholder="John Doe"
                                            value={signupName}
                                            onChange={(e) => setSignupName(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="signup-email">Email</Label>
                                        <Input
                                            id="signup-email"
                                            type="email"
                                            placeholder="john@example.com"
                                            value={signupEmail}
                                            onChange={(e) => {
                                                setSignupEmail(e.target.value);
                                                if (signupInlineError) setSignupInlineError('');
                                            }}
                                            required
                                        />
                                        {signupInlineError && (
                                            <p className="text-xs text-destructive" role="alert">
                                                {signupInlineError}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="signup-password">Password</Label>
                                        <Input
                                            id="signup-password"
                                            type="password"
                                            placeholder="********"
                                            value={signupPassword}
                                            onChange={(e) => setSignupPassword(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="flex items-center space-x-2 pt-2">
                                        <Checkbox
                                            id="org-account"
                                            checked={signupIsOrgAccount}
                                            onCheckedChange={(checked) => setSignupIsOrgAccount(checked)}
                                        />
                                        <Label htmlFor="org-account" className="font-normal cursor-pointer">
                                            Creating account for organizational use
                                        </Label>
                                    </div>

                                    {signupIsOrgAccount && (
                                        <div className="space-y-3 pt-2 border-t">
                                            <p className="text-xs text-muted-foreground">
                                                You'll become the organization admin and can add employees
                                            </p>
                                            <div className="space-y-2">
                                                <Label htmlFor="org-name">Organization Name</Label>
                                                <Input
                                                    id="org-name"
                                                    type="text"
                                                    placeholder="Acme Corporation"
                                                    value={signupOrgName}
                                                    onChange={(e) => setSignupOrgName(e.target.value)}
                                                    required={signupIsOrgAccount}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="org-description">Organization Description (Optional)</Label>
                                                <Input
                                                    id="org-description"
                                                    type="text"
                                                    placeholder="Brief description of your organization"
                                                    value={signupOrgDescription}
                                                    onChange={(e) => setSignupOrgDescription(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <Button type="submit" className="w-full">
                                        Create Account
                                    </Button>
                                </form>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
