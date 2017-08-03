
var TestVerifier = Class.extend({
    _name : "TestVerifier",
    SUCCESS : {status: "success", message: "test successful"},
    verify : function() {
        try{
            return mixin({testName: this.classString()}, this.i_verifyImpl.apply(this, arguments));
        }
        catch(e) {
            return {testName: this.classString(), status: "exception", message: "The test crashed with an uncaught exception", exception: e};
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

var NoAssertionFailuresVerifier = TestVerifier.extend({
    _name: "NoAssertionFailureVerifier",
    i_verifyImpl : function(program) {
        var sim = Simulation.instance(program);
        sim.start();
        sim.runToEnd();
        if (!sim.hasAssertionFailureOccurred()) {
            return TestVerifier.SUCCESS;
        }
        else {
            return {status: "failure", message: "An assertion in the program failed when run."};
        }
    }
});

var ProgramTest = Class.extend({
    _name: "ProgramTest",

    setDefaultReporter : function(reporter) {
        this.i_defaultReporter = reporter;
    },

    init : function(sourceFiles, translationUnits, verifiers, reporter) {
        if (!Array.isArray(verifiers)) { verifiers = [verifiers]; }
        reporter = reporter || this.i_defaultReporter;
        this.program = Program.instance();
        sourceFiles.forEach(this.program.addSourceFile.bind(this.program));
        translationUnits.forEach(this.program.createTranslationUnitForSourceFile.bind(this.program));
        this.program.fullCompile();

        var self = this;
        this.results = verifiers.map(function(verifier) {
            return verifier.verify(self.program);
        });

        reporter && reporter(this);
    }
});

var SingleTranslationUnitTest = ProgramTest.extend({
    _name: "SingleTranslationUnitTest",

    init : function(sourceText, verifiers) {
        this.initParent([SourceFile.instance("test.cpp", sourceText)], ["test.cpp"], verifiers);
    }
});