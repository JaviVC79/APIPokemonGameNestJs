import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { baseUrl } from './hash/constants';
import { Player } from '@prisma/client';

@Injectable()
export class SendMailService {



    constructor() { }

    async sendEmail(recipient: string, user_id: string, playerName: string) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { data, error } = await resend.emails.send({
            from: "noreply@javivc.site",
            to: [recipient],
            subject: `Welcome to Pokemon Game!`,
            html: `
            <h1>Welcome to Pokemon Game! ${playerName}</h1>
            <p>Please click the following link to verify your email address:</p>
            https://apipokemongamenestjs.onrender.com/pokemon-api/email_verification/${user_id}"
            `,
        });
        if (error) {
            console.log(error)
            return error
        } else {
            console.log(data)
            return data
        }
    }

    async sendEmailVerificationOK(recipient: string, nickName: string) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { data, error } = await resend.emails.send({
            from: "noreply@javivc.site",
            to: [recipient],
            subject: `Pokemon Game email verifification done`,
            html: `
            <h2>${nickName}, you are now verified!, enjoy the game!!</h2>
            `,
        });
        if (error) {
            console.log(error)
            return error
        } else {
            console.log(data)
            return data
        }
    }

    async sendNewPassword(recipient: string, password: string, user_id: string) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { data, error } = await resend.emails.send({
            from: "noreply@javivc.site",
            to: [recipient],
            subject: `Pokemon Game new password`,
            html: `
            <p>Dear [User's Name],</p> 
            <p>We wanted to inform you that the password for your account was successfully changed on [Date and Time]. If you initiated this change, no further action is required.</p> 
            <p>However, if you did not request this change, please ignore this email and immediately review your account for any unauthorized activity. We recommend updating your password and enabling two-factor authentication to enhance your account security.</p> 
            <p>If you request this change, please click the following link to verify your password changes:</p>
            https://apipokemongamenestjs.onrender.com/pokemon-api/confirm_new_password/${user_id}/${password}"
            <p>Best regards,<br>Pokemon Card Game Support Team</p>
            `,
        });
        if (error) {
            console.log(error)
            return error
        } else {
            console.log(data)
            return data
        }
    }
    async sendChangePasswordVerification(user: Player) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { data, error } = await resend.emails.send({
            from: "noreply@javivc.site",
            to: [user.email],
            subject: `Pokemon Card Game password changes verifification done`,
            html: `
            <h2>${user.nickName}, your password has been changed successfully!, enjoy the game!!</h2>
            <p>Your new password is ${user.password}</p>
            `,
        });
        if (error) {
            console.log(error)
            return error
        } else {
            console.log(data)
            return data
        }
    }
}