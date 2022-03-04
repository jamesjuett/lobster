import { listenTo, MessageResponses, messageResponse, stopListeningTo } from "../util/observe";
import { Mutable } from "../util/util";
import { StandardInputStream } from "../core/compilation/streams";







export class IstreamBufferOutlet {

    public readonly name: string;
    public readonly istream?: StandardInputStream;

    private readonly element: JQuery;
    private readonly bufferContentsElem: JQuery;
    private readonly iostateElem: JQuery;

    public _act!: MessageResponses;

    public constructor(element: JQuery, name: string) {

        this.element = element.addClass("lobster-istream-buffer");
        element.append(`<span class="lobster-istream-buffer-name">${name} buffer</span>`);
        this.name = name;
        this.iostateElem = $('<span class="lobster-istream-iostate"></span>').appendTo(element);
        this.bufferContentsElem = $('<span class="lobster-istream-buffer-contents"></span>').appendTo(element);
    }

    public setIstream(istream: StandardInputStream) {
        this.clearIstream();
        (<Mutable<this>>this).istream = istream;
        listenTo(this, istream);

        this.onBufferUpdated(istream.buffer);
        this.onIostateUpdated();
    }

    public clearIstream() {
        this.bufferContentsElem.html("");

        if (this.istream) {
            stopListeningTo(this, this.istream);
        }
        delete (<Mutable<this>>this).istream;
    }

    @messageResponse("bufferUpdated", "unwrap")
    protected onBufferUpdated(contents: string) {
        this.bufferContentsElem.html(`cin <span class="glyphicon glyphicon-arrow-left"></span> ${contents}`);
    }

    @messageResponse("iostateUpdated", "unwrap")
    protected onIostateUpdated() {
        this.iostateElem.hide().html("");
        if (this.istream?.fail()) {
            this.iostateElem.show().append('<span class="label label-danger">fail</span>');
        }
        if (this.istream?.bad()) {
            this.iostateElem.show().append('<span class="label label-danger">bad</span>');
        }
        if (this.istream?.eof()) {
            this.iostateElem.show().append('<span class="label label-warning">EOF</span>');
        }
    }

}
