(function(_, undefined) {
    function validate(arg) {
        return new Validator(arg);
    }

    function Validator(arg) {
        this.arg = arg;
        this.validator = function(a) { return !_.isUndefined(a); }
        this.onFailure = _.identity;
        this.onFailureContext = undefined;
        this.onSuccess = _.identity;
        this.onSuccessContext = undefined;
    }

    _.extend(Validator.prototype, {
        withValidator: function withValidator(validator) {
            this.validator = validator;
            return this;
        },

        onFailure: function failure(callback, context) {
            this.onFailure = callback;
            this.onFailureContext = context;
        },

        onSuccess: function success(callback, context) {
            this.onSuccess = callback;
            this.onSuccessContext = context;
        },

        withDefault: function withDefault(d) {
            return this.validator(this.arg) ?
                this.onSuccess.call(this.onSuccessContext, this.arg) :
                this.onFailure.call(this.onFailureContext, d);
        },

        throwError: function throwError(message) {
            if (this.validator(this.arg)) {
                return this.onSuccess.call(this.onSuccessContext, this.arg);
            } else {
                throw new Error(message);
            }
        },

        throwNoArg: function throwNoArg(fieldname) {
            return this.throwError("Argument missing: " + fieldname);
        },

        check: function check() {
            return this.withDefault(undefined);
        },
    });

    Validator.extend = _.extend;

    _.mixin({
        checkarg: validate,
    });
})(_);
