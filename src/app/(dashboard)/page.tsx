"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useLogin } from "@/features/auth/api/use-login";

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
        userId: user.id,
      },
    });
  }, [isLoaded, user, mutate]);

  return null;
};

export default Page;