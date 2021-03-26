export async function importScript(src: string){
    return new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.async = true;
        script.src = src;
        script.addEventListener('load', (event)=>{
            resolve();
        });
        script.addEventListener('error', () => reject(`Error loading script "${src}"`))
        script.addEventListener('abort', () => reject(`Script loading aborted for "${src}"`))
        document.head.appendChild(script);
    });
}
