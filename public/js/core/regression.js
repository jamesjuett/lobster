
var TestVerifier = Class.extend({
    _name : "TestVerifier",
    SUCCESS : {status: "success", message: "test successful"},
    verify : function() {
        try{
            return this.i_verifyImpl.apply(this, arguments);
        }
        catch(e) {
            return {status: "exception", message: "The test crashed with an uncaught exception", exception: e};
        }
    }
});



var NoErrorsNoWarningsVerifier = TestVerifier.extend({
    _name: "NoErrorsNoWarningsVerifier",
    i_verifyImpl : function(program) {
        if (!program.hasErrors() && !program.hasWarnings()) {
            return TestVerifier.SUCCESS;
        }
        else {
            return {status: "failure", message: "There were errors or warnings, but there shouldn't have been."};
        }
    }
});

var ProgramTest = Class.extend({
    _name: "ProgramTest",

    setDefaultReporter : function(reporter) {
        this.i_defaultReporter = reporter;
    },

    init : function(sourceFiles, translationUnits, verifier, reporter) {
        reporter = reporter || this.i_defaultReporter;
        this.program = Program.instance();
        sourceFiles.forEach(this.program.addSourceFile.bind(this.program));
        translationUnits.forEach(this.program.createTranslationUnitForSourceFile.bind(this.program));
        this.program.fullCompile();

        this.results = verifier.verify(this.program);

        reporter && reporter(this);
    }
});

var SingleTranslationUnitTest = ProgramTest.extend({
    _name: "SingleTranslationUnitTest",

    init : function(sourceText, verify) {
        this.initParent([SourceFile.instance("test.cpp", sourceText)], ["test.cpp"], verify);
    }
});