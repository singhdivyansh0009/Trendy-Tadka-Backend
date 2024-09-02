export const genrateOtp = () => {
    const otp = Math.floor(100000 + Math.random() * 900000);
    return otp.toString().padStart(6, '0');
}