"use client"
import { ClipLoader } from "react-spinners";

export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <ClipLoader size={45} color="#000" />
    </div>
  );
}