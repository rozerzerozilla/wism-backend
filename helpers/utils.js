const otpGenerator = require('otp-generator')
exports.OTP_generator = () => {
   return otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false });
}

exports.addMinutesToDate = (date, minutes)=> {
    return new Date(date.getTime() + minutes * 60000);
}