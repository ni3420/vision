"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useLogin } from "@/features/auth/api/use-login";
import DashBoardPage from "@/features/dashboard/components/dashboard-page"; // Adjust import path if needed

const Page = () => {
  const { user, isLoaded } = useUser();
  const { mutate } = useLogin();

  useEffect(() => {
    if (!isLoaded || !user) return;
    const email = user.primaryEmailAddress?.emailAddress;

    if (!email) return;

    mutate({
      json: {
        email,
        name: user.fullName || "",
      },
    });
  }, [isLoaded, user, mutate]);

  return <DashBoardPage />;
};

export default Page;