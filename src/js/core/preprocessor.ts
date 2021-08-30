import { Mutable } from "../util/util";
import { NoteRecorder, CPPError } from "./errors";


/**
 * A simple, immutable object that contains a filename and its text contents.
 * Because it is immutable, don't grab a reference to someone's source file
 * and expect it to update - changes to a file's context require a completely new object.
 */
 export class SourceFile {

  public readonly name: string;
  public readonly text: string;
  public readonly isLibrary: boolean;

  public constructor(name: string, text: string, isLibrary: boolean = false) {
      this.name = name;
      this.text = text;
      this.isLibrary = isLibrary;
  }

  // setText : function(text) {
  //     this.i_text = text;
  //     this.send("textChanged");
  // },

}

interface SourceReferenceInclude {
  sourceFile: SourceFile;
  lineIncluded: number;
}

export class SourceReference {

  /**
   * Creates a wrapper to represent a reference to source code that has been included in another file.
   */
  public static createIncluded(sourceFile: SourceFile, lineIncluded: number, originalReference: SourceReference) {
      var obj = new SourceReference(originalReference.sourceFile, originalReference.line, originalReference.column,
          originalReference.start, originalReference.end);
      obj._includes.push({
          sourceFile: sourceFile,
          lineIncluded: lineIncluded
      });
      originalReference.includes.forEach((inc) => obj._includes.push(inc));
      return obj;
  }

  public readonly sourceFile: SourceFile;
  public readonly line: number;
  public readonly column: number;
  public readonly start: number;
  public readonly end: number;

  private readonly _includes: SourceReferenceInclude[] = [];
  public readonly includes: readonly SourceReferenceInclude[] = this._includes;

  public constructor(sourceFile: SourceFile, line: number, column: number, start: number, end: number) {
      this.sourceFile = sourceFile;
      this.line = line;
      this.column = column;
      this.start = start;
      this.end = end;
  }

  get isIncluded() {
      return this.includes.length > 0;
  }

  // getIncludePrelude : function() {
  //     var str = "";
  //     var prevInclude = this.sourceFile;
  //     this.i_includes.forEach(function(include) {
  //         str += "In file \"" + include.sourceFile.getName() + "\" included from " + prevInclude.getName() + "\""
  //
  //     });
  // }

}

export class PreprocessedSource {

  public readonly primarySourceFile: SourceFile;
  public readonly name: string;
  public readonly availableToInclude: { [index: string]: SourceFile | undefined };

  public readonly notes = new NoteRecorder();

  private readonly _includes: IncludeMapping[] = [];
  public readonly includes: readonly IncludeMapping[] = this._includes;

  // public readonly includedSourceFiles: { [index: string]: SourceFile } = {};

  private readonly defines: { [index: string]: string } = {};

  public readonly preprocessedText: string;
  public readonly numLines: number;
  public readonly length: number;

  private currentOffset: number;
  // private currentIncludeOffset: number;
  private currentLineNumber: number;
  private originalIncludeLineNumber: number;

  private readonly alreadyIncluded: Set<string>;

  public constructor(sourceFile: SourceFile, availableToInclude: { [index: string]: SourceFile | undefined }, alreadyIncluded: ReadonlySet<string> = new Set()) {
      this.primarySourceFile = sourceFile;
      this.name = sourceFile.name;
      this.availableToInclude = availableToInclude;

      this.alreadyIncluded = new Set(alreadyIncluded);
      this.alreadyIncluded.add(this.primarySourceFile.name);

      let codeStr = sourceFile.text;

      codeStr = this.cleanCode(codeStr);
      codeStr = this.filterUnsupportedDirectives(codeStr);

      // this.currentIncludeOffset = 0;
      this.currentLineNumber = 1;
      this.originalIncludeLineNumber = 1;
      this.currentOffset = 0;
      let newCodeStr = "";
      // this.includedSourceFiles[this.primarySourceFile.name] = this.primarySourceFile;

      // All preprocessor directives must be on their own line,
      // so we can process line-by-line
      let lines = codeStr.split("\n");
      lines.forEach((line) => {
          let newLine = this.processLine(line);
          newCodeStr += (newLine + "\n");
          
          this.currentLineNumber += (1 + newLine.split("\n").length - 1);
          this.currentOffset += (newLine.length + 1); // +1 for the extra "\n"
          
      });

      this.preprocessedText = newCodeStr;
      this.length = this.preprocessedText.length;
      this.numLines = this.currentLineNumber;
  }

  private processLine(line: string) {
      // ignore lines that do not start with #
      if (!line.trim().startsWith("#")) {
          return line;
      }
      
      return this.processPoundDefine(line)
          ?? this.processPoundInclude(line)
          ?? line;
  }

  private sourceReferenceForCurrentLine(line: string): SourceReference {
      return new SourceReference(this.primarySourceFile, this.currentLineNumber, 0, this.currentOffset, this.currentOffset + line.length);
  }

  private replaceLineWithBlanks(line: string) {
      // Return a string of spaces with the same length as the line in order to preserve
      // character offsets, line numbers, etc. for source references. The spaces, however,
      // will be ignored by subsequent compilation.
      return Array(line.length + 1).join(" ");
  }

  private processPoundDefine(line: string) {
      let m = line.match(/^\s*#\s*define(\s+(?<identifier>\S+))? *( +(?<replacement>\S.+))?$/);
      if (!m) { return; }
      
      let identifier = m.groups?.identifier;
      let replacement = m.groups?.replacement;

      if (identifier) {

          if (this.defines[identifier]) {
              this.notes.addNote(CPPError.preprocess.define.redefinition(this.sourceReferenceForCurrentLine(line), identifier));
          }

          // Note that replacement may be undefined, which is handled by the .define() function
          this.define(identifier, replacement ?? "");

          // Lobster doesn't actually do any replacements, so issue this error for now.
          if (m.groups?.replacement) {
              this.notes.addNote(CPPError.preprocess.define.replacement_unsupported(this.sourceReferenceForCurrentLine(line)));
          }
      }
      else {
          this.notes.addNote(CPPError.preprocess.define.identifier_required(this.sourceReferenceForCurrentLine(line)));
      }
      return this.replaceLineWithBlanks(line);
  }

  private processPoundInclude(line: string) {
      let m = line.match(/^\s*#\s*include/);
      if (!m) { return; }

      // Attempt to match an include and the filename it includes
      m = line.match(/^\s*#\s*include\s*(["<](?<filename>.*)[">])?\s*$/);
      if (!m) {
          this.notes.addNote(CPPError.preprocess.include.malformed(this.sourceReferenceForCurrentLine(line)));
          return this.replaceLineWithBlanks(line);
      }

      let filename = m.groups?.filename;

      // empty filename
      if (!filename) {
          this.notes.addNote(CPPError.preprocess.include.empty_filename(this.sourceReferenceForCurrentLine(line)));
          return this.replaceLineWithBlanks(line);
      }

      // check for self inclusion
      if (this.alreadyIncluded.has(filename)) {
          this.notes.addNote(CPPError.preprocess.include.recursive_prohibited(this.sourceReferenceForCurrentLine(line)));
          return this.replaceLineWithBlanks(line);
      }
  
      let includedSourceFile = this.availableToInclude[filename];
      //TODO: what happens if the file doesn't exist?
      if (!includedSourceFile) {
          this.notes.addNote(CPPError.preprocess.include.file_not_found(this.sourceReferenceForCurrentLine(line), filename));
          return this.replaceLineWithBlanks(line);
      }

      // Replace the #include line with the included source.
      // Will also populate i_includes array.
      let mapping: Mutable<Partial<IncludeMapping>> = {};

      mapping.startLine = this.currentLineNumber;
      mapping.startOffset = this.currentOffset;

      // currentIncludeOffset = offset + includeLine.length;

      // Recursively preprocess the included file
      let included = new PreprocessedSource(includedSourceFile, this.availableToInclude, this.alreadyIncluded);
      this.notes.addNotes(included.notes.allNotes);

      // Object.assign(this.includedSourceFiles, included.includedSourceFiles);

      mapping.numLines = included.numLines;
      mapping.endLine = mapping.startLine + included.numLines;
      mapping.lineDelta = included.numLines - 1;
      mapping.lengthDelta = included.length - line.length;
      mapping.included = included;
      mapping.lineIncludedFrom = mapping.startLine;

      this._includes.push(<IncludeMapping>mapping); // TODO: remove cast

      return included.preprocessedText;
  }

  private cleanCode(codeStr: string) {
      // remove carriage returns
      return codeStr.replace(/\r/g, "");
  }
  
  private define(identifier: string, replacement: string) {
      this.defines[identifier] = replacement;
  }

  // private processDefines(codeStr: string) {

  //     // All preprocessor directives must be on their own line,
  //     // so we can process line-by-line
  //     let lines = codeStr.split("\n");

  //     let newLines = lines.map((line, i) => {
          
  //         // ignore lines that do not start with #
  //         if (!line.trim().startsWith("#")) {
  //             return line;
  //         }
          

  //         else if (line.match(/# *ifndef/)) {
  //             line = line.replace(/#ifndef.*/g, function (match) {
  //                 return Array(match.length + 1).join(" ");
  //             });
  //             // this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#define</span>) that isn't supported at the moement.");
  //         }
          
  
  //         else if (line.match("# *ifndef")) {
  //             line = line.replace(/#ifndef.*/g, function (match) {
  //                 return Array(match.length + 1).join(" ");
  //             });
  //             // this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#define</span>) that isn't supported at the moement.");
  //         }
  //         else if (line.match("# *define")) {
  //             line = line.replace(/#define.*/g, function (match) {
  //                 return Array(match.length + 1).join(" ");
  //             });
  //             // this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#define</span>) that isn't supported at the moement.");
  //         }
  //         else if (line.match("# *endif")) {
  //             line = line.replace(/#endif.*/g, function (match) {
  //                 return Array(match.length + 1).join(" ");
  //             });
  //             // this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#define</span>) that isn't supported at the moement.");
  //         }
  //     });

  //     // Join preprocessed lines back together
  //     codeStr = newLines.join("\n");

  //     return codeStr;
  // }

  private filterUnsupportedDirectives(codeStr: string) {

      // if (codeStr.contains(/#include.*<.*>/g)){
      // codeStr = codeStr.replace(/#include.*<.*>/g, function (match) {
      //     return Array(match.length + 1).join(" ");
      // });
      // this.send("otherError", "It looks like you're trying to use a preprocessor directive (e.g. <span class='code'>#define</span>) that isn't supported at the moement.");
      // }
      if (codeStr.includes("using namespace")) {
          codeStr = codeStr.replace(/using namespace.*/g, function (match) {
              return Array(match.length + 1).join(" ");
          });
          // TODO NEW why is this commented?
          // this.send("otherError", "When writing code in lobster, you don't need to include using directives (e.g. <span class='code'>using namespace std;</span>).");
      }
      if (codeStr.includes("using std::")) {
          codeStr = codeStr.replace(/using std::.*/g, function (match) {
              return Array(match.length + 1).join(" ");
          });
          // this.send("otherError", "Lobster doesn't support using declarations at the moment.");
      }
      return codeStr;
  }

  public getSourceReference(line: number, column: number, start: number, end: number): SourceReference {

      // Iterate through all includes and check if any would contain
      let offset = 0;
      let lineOffset = 1;
      this.includes.forEach((inc, i) => {
          if (line < inc.startLine) {
              return new SourceReference(this.primarySourceFile, line - lineOffset + 1, column, start && start - offset, end && end - offset);
          }
          else if (inc.startLine <= line && line < inc.endLine) {
              return SourceReference.createIncluded(this.primarySourceFile, inc.lineIncludedFrom,
                  inc.included.getSourceReference(line - inc.startLine + 1, column, start && start - inc.startOffset, end && end - inc.startOffset));
          }
          offset += inc.lengthDelta;
          lineOffset += inc.lineDelta;
      });

      // If this line wasn't part of any of the includes, just return a regular source reference to the original
      // source file associated with this translation unit
      return new SourceReference(this.primarySourceFile, line - lineOffset + 1, column, start && start - offset, end && end - offset);
  }

}

interface IncludeMapping {
  readonly startLine: number;
  readonly startOffset: number;
  readonly numLines: number;
  readonly endLine: number;
  readonly lineDelta: number;
  readonly lengthDelta: number;
  readonly included: PreprocessedSource;
  readonly lineIncludedFrom: number;
}