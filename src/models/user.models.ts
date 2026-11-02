import mongoose, { Schema } from "mongoose"

import { PLAN_IDS, type PlanId } from "@/lib/plans"

interface UserTypes {
    userId: string
    name: string
    email: string
    plan: PlanId
    freeUsesCount: number
    credits: number
    creditsResetAt?: Date | null
    trialEndsAt?: Date | null
    stripeCustomerId?: string | null
    stripeSubscriptionId?: string | null
    subscriptionStatus?: string | null
}

const UserSchema = new Schema<UserTypes>({
    userId: {
        type: String,
        unique: true,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    plan: {
        type: String,
        enum: PLAN_IDS,
        default: "FREE"
    },
    freeUsesCount: {
        type: Number,
        default: 0
    },
    credits: {
        type: Number,
        default: 0
    },
    creditsResetAt: {
        type: Date,
        default: null
    },
    trialEndsAt: {
        type: Date,
        default: null
    },
    stripeCustomerId: {
        type: String,
        default: null
    },
    stripeSubscriptionId: {
        type: String,
        default: null
    },
    subscriptionStatus: {
        type: String,
        default: null
    }
}, { timestamps: true })

export const User = mongoose.models.user || mongoose.model<UserTypes>("user", UserSchema)
