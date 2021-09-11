import { assert } from "chai";
import { trimStart } from "lodash";
import { Observable } from "../util/observe";
import { Mutable } from "../util/util";
import { ArithmeticType, SuccessParsingResult, ErrorParsingResult, isType, Char, isIntegralType, ParsingResult } from "./types";

export enum IOState {
  good = 0,
  bad = 1,
  eof = 2,
  fail = 4,
  bad_eof = 3,
  bad_fail = 5,
  eof_fail = 6,
  bad_eof_fail = 7
};

type StandardInputStreamMessages =
  "bufferUpdated";

export class StandardInputStream {

  public readonly observable = new Observable<StandardInputStreamMessages>(this);

  public readonly trimws: boolean = true;

  public readonly buffer: string = "";

  private iostate: IOState = IOState.good;

  // public readonly bufferAdditionRecord : readonly {readonly stepsTaken: number; readonly contents: string}[] = [];
  
  // public clone() {
  //     let dup = new SimulationInputStream();
  //     (<Mutable<SimulationInputStream>>dup).buffer = this.buffer;
  //     (<Mutable<SimulationInputStream>>dup).bufferAdditionRecord = clone(this.bufferAdditionRecord)
  //     return dup;
  // }

  public reset() {
      this.clearBuffer();
      this.clear();
      // (<Mutable<this>>this).bufferAdditionRecord = [];
      return this;
  }
  
  // public rewind(stepsTaken: number) {
  //     let i = this.bufferAdditionRecord.length;
  //     while (i > 0 && this.bufferAdditionRecord[i-1].stepsTaken >= stepsTaken+1) {
  //         --i;
  //     }

  //     (<Mutable<this>>this).bufferAdditionRecord = this.bufferAdditionRecord.slice(0, i);
  //     this.updateBuffer(this.bufferAdditionRecord.map(record => record.contents).join(""));
  //     return this;
  // }

  public clearBuffer() {
    this.updateBuffer("");
  }

  public addToBuffer(s: string) {
      this.updateBuffer(this.buffer + s);
      // asMutable(this.bufferAdditionRecord).push({stepsTaken:stepsTaken, contents: s});
      return this;
  }

  private updateBuffer(contents: string) {
      (<Mutable<this>>this).buffer = contents;
      this.observable.send("bufferUpdated", this.buffer);
  }

  public skipws() {
      (<Mutable<this>>this).buffer = trimStart(this.buffer);
  }

  // See e.g. https://en.cppreference.com/w/cpp/named_req/FormattedInputFunction
  public extractAndParseFromBuffer(type: ArithmeticType) : SuccessParsingResult<ArithmeticType> | undefined {

      // Attempt to read from a finished or broken stream, set failbit
      if (this.eof() || this.bad()) {
          this.setstate(IOState.fail);
      }

      // If the stream is not in a good state, input operation does nothing
      if (!this.good()) {
          return;
      }

      let result : ParsingResult<ArithmeticType>;
      if (isType(type, Char)) {
          result = type.parse(this.extractCharFromBuffer());
      }
      else if (isIntegralType(type)) {
          result = type.parse(this.extractIntFromBuffer());
      }
      else {
          result = type.parse(this.extractDoubleFromBuffer());
      }
      
      assert(result.kind === "success");
      return <SuccessParsingResult<ArithmeticType>>result;
  }

  public extractCharFromBuffer() {
      let c = this.buffer.charAt(0);
      this.updateBuffer(this.buffer.substring(1));
      return c;
  }
  
  public extractIntFromBuffer() {
      let m = this.buffer.match(/^[+-]?[0123456789]+/);
      if (m) {
          // match found
          this.updateBuffer(this.buffer.substring(m[0].length));
          return m[0];
      }
      else {
          // error, no viable int at start of stream buffer
          // (or stream buffer was empty)
          // buffer contents are not changed
          this.setstate(IOState.fail)
          return "0"; // return so that we'll parse a 0 according to C++ standard
      }
  }
  
  public extractDoubleFromBuffer() {

      // matches anything with numbers and a dot
      let m = this.buffer.match(/^[+-]?[0123456789]*\.[0123456789]*/);

      if (m && m[0] !== "." && m[0] !== "+." && m[0] !== "-.") { // a match that isn't just a .
          // match found
          this.updateBuffer(this.buffer.substring(m[0].length));
          return m[0];
      }
      else {
          // error, no viable int at start of stream buffer
          // (or stream buffer was empty)
          // buffer contents are not changed
          this.setstate(IOState.fail)
          return "0"; // return so that we'll parse a 0 according to C++ standard
      }
  }

  public extractWordFromBuffer() {
      let firstWhitespace = this.buffer.search(/\s/g);
      if (firstWhitespace === -1) {
          // no spaces, whole buffer is one word
          let word = this.buffer;
          this.updateBuffer("");
          return word;
      }
      else {
          // extract first word, up to but not including whitespace
          let word = this.buffer.substring(0, firstWhitespace);

          // remove from buffer, including space.
          this.updateBuffer(this.buffer.substring(firstWhitespace + 1));
          return word;
      }
  }

  public extractLineFromBuffer() {
      let firstNewline = this.buffer.indexOf("\n");
      if (firstNewline === -1) {
          // no spaces, whole buffer is one word
          let word = this.buffer;
          this.updateBuffer("");
          return word;
      }
      else {
          // extract first word, up to but not including newline
          let word = this.buffer.substring(0, firstNewline);

          // remove from buffer, including space.
          this.updateBuffer(this.buffer.substring(firstNewline + 1));
          return word;
      }
  }

  public rdstate() {
      return this.iostate;
  }

  public setstate(state: IOState) {
      this.iostate = this.iostate | state;
  }

  public clear(state: IOState = IOState.good) {
      this.iostate = state;
  }

  public good() {
      // this check is different than those for fail/eof/bad
      // since IOState.good is 000.
      return this.iostate == IOState.good;
  }

  public fail() {
      return (this.iostate & IOState.fail) == IOState.fail;
  }

  public eof() {
      return (this.iostate & IOState.eof) == IOState.eof;
  }

  public bad() {
      return (this.iostate & IOState.bad) == IOState.bad;
  }


}