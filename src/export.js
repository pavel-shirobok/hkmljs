var HkmlExport = function(eventTarget){
    return new HkmlKeyboardController(eventTarget);
};

HkmlExport.HkmlVM = HkmlVM;
HkmlExport.HkmlKeyboardController = HkmlKeyboardController;
HkmlExport.HkmlCompiler = HkmlCompiler;
HkmlExport.KeysNode = KeysNode;
HkmlExport.Keyboard = Keyboard;

root.hkml = HkmlExport;

