import inspect
import gradio_client
from gradio_client import Client, file, handle_file

print('version=', getattr(gradio_client, '__version__', 'unknown'))
print('has handle_file=', hasattr(gradio_client, 'handle_file'))
print('predict sig=', inspect.signature(Client.predict))
print('submit sig=', inspect.signature(Client.submit) if hasattr(Client, 'submit') else 'submit missing')
print('queue present=', hasattr(Client, 'queue'))
print('file repr=', repr(file))
print('handle_file repr=', repr(handle_file))
print('file type=', type(file))
print('handle_file type=', type(handle_file))
print('file source len=', len(inspect.getsource(file)))
print('handle_file source len=', len(inspect.getsource(handle_file)))
print('file source tail=')
print(inspect.getsource(file).splitlines()[-10:])
print('handle_file source tail=')
print(inspect.getsource(handle_file).splitlines()[-10:])
