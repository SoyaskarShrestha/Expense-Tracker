import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../../context/AppContext';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
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

        try {
            await signup(signupName, signupEmail, signupPassword);
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
