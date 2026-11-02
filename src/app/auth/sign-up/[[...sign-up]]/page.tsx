"use client"

import { SignUp } from "@clerk/nextjs";

const SignUpPage = () => {
    return ( <>
    <div className="flex h-screen items-center justify-center">
        <SignUp fallbackRedirectUrl="/dashboard" />
    </div>
    </> );
}
 
export default SignUpPage;