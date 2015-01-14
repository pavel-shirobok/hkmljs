var HkmlKeyboardController = function(eventsTarget) {
    this._eventsTarget = eventsTarget || root;
    this._virtualMachines = {};
    this.startKeyboardEventListening();
};

HkmlKeyboardController.prototype.startKeyboardEventListening = function(){
    var self = this;
    this._eventsTargetCallback = function(e){
        self.onKeyDown(e);
    };
    this._eventsTarget.addEventListener('keydown', this._eventsTargetCallback);
};

HkmlKeyboardController.prototype.onKeyDown = function(e){
    for(var markup in this._virtualMachines){
        //noinspection JSUnfilteredForInLoop
        var wrapper = this._virtualMachines[markup];
        var vm = wrapper.vm;
        var callback = wrapper.callback;

        if (vm.checkPressedKey(e.keyCode)) {
            if (vm.finished) {
                vm.reset();
                callback && callback(vm.markup, true);
            }
        } else {
            vm.reset();
            callback && callback(vm.markup, false);
        }
    }
};

HkmlKeyboardController.prototype.on = function(markup, callback){
    if(this._virtualMachines[markup]){
        throw new Error("Handler for '" + markup + "' already exist");
    }
    this._virtualMachines[markup] = { vm : HkmlCompiler.compile(markup), callback : callback };
};

HkmlKeyboardController.prototype.remove = function(markup) {
    if (!this._virtualMachines[markup]) {
        throw new Error("Handler for '" + markup + "' does not exist")
    }
    var wrapper = this._virtualMachines[markup];
    wrapper.vm.destroy();
    wrapper.callback = undefined;

    delete this._virtualMachines[markup];

    return this;
};

HkmlKeyboardController.prototype.trigger = function(markup){
    if (this._virtualMachines[markup]) {
        var callback = this._virtualMachines[markup].callback;
        callback && callback(markup, true);
    }
    return this;
};

HkmlKeyboardController.prototype.destroy = function(){
    this._eventsTarget.addEventListener('keydown', this._eventsTargetCallback);
};