declare namespace chrome {
  namespace offscreen {
    type Reason =
      | 'AUDIO_PLAYBACK'
      | 'BLOBS'
      | 'DOM_PARSER'
      | 'IFRAME_SCRIPTING'
      | 'TESTING';

    interface CreateDocumentOptions {
      url: string;
      reasons: Reason[];
      justification: string;
    }

    function createDocument(options: CreateDocumentOptions): Promise<void>;
    function hasDocument(): Promise<boolean>;
    function closeDocument(): Promise<void>;
  }
}
