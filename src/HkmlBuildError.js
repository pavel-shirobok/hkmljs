// code from http://stackoverflow.com/a/8460753
function HkmlBuildError(message) {
    this.constructor.prototype.__proto__ = Error.prototype // Make this an instanceof Error.
    Error.call(this) // Does not seem necessary. Perhaps remove this line?
    Error.captureStackTrace(this, this.constructor) // Creates the this.stack getter
    this.name = this.constructor.name; // Used to cause messages like "UserError: message" instead of the default "Error: message"
    this.message = message; // Used to set the message
}