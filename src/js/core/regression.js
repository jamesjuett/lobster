
import {Program} from "program";

export var TestVerifier = Class.extend({
    _name : "TestVerifier",
    SUCCESS : {status: "success", message: "test successful"},
    verify : function() {
        try{
            return mixin({verifierName: this.classString()}, this.i_verifyImpl.apply(this, arguments));
        }
        catch(e) {
            return {verifierName: this.classString(), status: "exception", message: "The test crashed with an uncaught exception", exception: e};
        }
    }
});



export var NoErrorsNoWarningsVerifier = TestVerifier.extend({
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

export var NoAssertionFailuresVerifier = TestVerifier.extend({
    _name: "NoAssertionFailureVerifier",
    i_verifyImpl : function(program) {
        var sim = Simulation.instance(program);
        sim.start();
        sim.runToEnd();
        if (!sim.hasEventOccurred(Simulation.EVENT_ASSERTION_FAILURE)) {
            return TestVerifier.SUCCESS;
        }
        else {
            return {status: "failure", message: "An assertion in the program failed when run."};
        }
    }
});

export var NoCrashesVerifier = TestVerifier.extend({
    _name: "NoAssertionFailureVerifier",
    i_verifyImpl : function(program) {
        var sim = Simulation.instance(program);
        sim.start();
        sim.runToEnd();
        if (!sim.hasEventOccurred(Simulation.EVENT_CRASH)) {
            return TestVerifier.SUCCESS;
        }
        else {
            return {status: "failure", message: "An assertion in the program failed when run."};
        }
    }
});

/**
 * Checks that no assertions fail and no crashes occur.
 */
export var NoBadRuntimeEventsVerifier = TestVerifier.extend({
    _name: "NoBadRuntimeEventsVerifier",
    i_verifyImpl : function(program) {
        var sim = Simulation.instance(program);
        sim.start();
        sim.runToEnd();

        var eventsToCheck = [
            Simulation.EVENT_UNDEFINED_BEHAVIOR,
            Simulation.EVENT_UNSPECIFIED_BEHAVIOR,
            Simulation.EVENT_IMPLEMENTATION_DEFINED_BEHAVIOR,
            Simulation.EVENT_MEMORY_LEAK,
            Simulation.EVENT_ASSERTION_FAILURE,
            Simulation.EVENT_CRASH];

        for(var i = 0; i < eventsToCheck.length; ++i) {
            var event = eventsToCheck[i];
            if (sim.hasEventOccurred(event)) {
                return {status: "failure", message: "An unexpected runtime event (" + event + ") occurred."};
            }
        }

        return TestVerifier.SUCCESS;
    }
});

export var ProgramTest = Class.extend({
    _name: "ProgramTest",

    setDefaultReporter : function(reporter) {
        this.i_defaultReporter = reporter;
    },

    init : function(name, sourceFiles, translationUnits, verifiers, reporter) {
        this.name = name;
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

export var SingleTranslationUnitTest = ProgramTest.extend({
    _name: "SingleTranslationUnitTest",

    init : function(name, sourceText, verifiers) {
        this.initParent(name, [SourceFile.instance("test.cpp", sourceText)], ["test.cpp"], verifiers);
    }
});