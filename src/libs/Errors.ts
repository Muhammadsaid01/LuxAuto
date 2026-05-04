export enum HttpCode {
    OK = 200,
    CREATED = 201,
    NO_CONTENT = 204,
    NOT_MODIFIED = 304,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    INTERNAL_SERVER_ERROR = 500
}

export enum Message {
    GENERIC_ERROR = "An error occurred. Please try again later!",
    NOT_FOUND = "The requested resource was not found!",
    UNAUTHORIZED = "You are not authorized to access this resource.",
    FORBIDDEN = "Access to this resource is forbidden." ,
    SOMETHING_WENT_WRONG = "Something went wrong. Please contact support.",
    NO_DATA_FOUND = "No data found.",
    CREATED_FAILED = "Failed to create the resource.",
    BLOCKED_USER = "You have been blocked, contanct admin",
    UPDATE_FAILED = "Failed to update the resource.",
    DELETE_FAILED = "Failed to delete the resource.",
    LOGIN_FAILED = "Login failed. Please check your credentials.",
    NO_MEMBER_NICK = "No member found with the provided nickname.",
    USED_NICK_PHONE = "The nickname or phone number is already in use.",
    WRONG_PASSWORD = "The password provided is incorrect.",
    NOT_AUTHENTICATED = "You must be logged in to access this resource.",
    NO_ENOUGH_POINTS = "You do not have enough points to complete this action.",
    NOT_MODIFIED = "",
    TOKEN_CREATING_FAILED = " TOKEN CRATETING ERROR"
}

class Errors extends Error {
    public code : HttpCode;
    public message: Message;

    static standard = {
        code : HttpCode.INTERNAL_SERVER_ERROR,
        message: Message.SOMETHING_WENT_WRONG
    }

    constructor(statusCode: HttpCode, statusMessage: Message) {
        super();
        this.code= statusCode;
        this.message = statusMessage;
    }
}


export default Errors;