import { t } from 'i18next';
import { addServer, validateServerURL } from './servers';


const defaultServerURL = 'https://open.rocket.chat';

let props = {
	visible: true,
	isOffline: false,
	serverURL: '',
	isValidating: false,
	errorMessage: '',
};
let section;

const setProps = (partialProps) => {
	props = {
		...props,
		...partialProps,
	};

	const setOffline = (isOffline) => setProps({ isOffline });
	const setServerURL = (serverURL) => setProps({ serverURL });
	const setErrorMessage = (errorMessage) => setProps({ errorMessage });
	const setValidating = (isValidating) => setProps({ isValidating });

	if (!section) {
		section = document.querySelector('.landing-view');

		const tryValidation = (resolve, reject) => {
			let { serverURL } = props;
			serverURL = serverURL.trim();

			setServerURL(serverURL);
			setErrorMessage('');

			if (!serverURL) {
				setValidating(false);
				resolve();
				return;
			}

			setValidating(true);

			validateServerURL(serverURL)
				.then(() => {
					setValidating(false);
					resolve();
				})
				.catch((status) => {
					if (status === 'basic-auth') {
						setErrorMessage(t('error.authNeeded', { auth: 'username:password@host' }));
						setValidating(false);
						reject();
						return;
					}

					if (/^https?:\/\/.+/.test(serverURL)) {
						if (status === 'invalid') {
							setErrorMessage(t('error.noValidServerFound'));
						} else if (status === 'timeout') {
							setErrorMessage(t('error.connectTimeout'));
						} else {
							setErrorMessage(status.message || String(status));
						}

						setValidating(false);
						reject();
						return;
					}

					if (!/(^https?:\/\/)|(\.)|(^([^:]+:[^@]+@)?localhost(:\d+)?$)/.test(serverURL)) {
						setServerURL(`https://${ serverURL }.rocket.chat`);
						return tryValidation(resolve, reject);
					}

					if (!/^https?:\/\//.test(serverURL)) {
						setServerURL(`https://${ serverURL }`);
						return tryValidation(resolve, reject);
					}
				});
		};

		const validate = () => new Promise(tryValidation);

		const handleConnectionChange = () => {
			setOffline(!navigator.onLine);
		};

		const handleFormSubmit = async (event) => {
			event.preventDefault();
			event.stopPropagation();

			await validate();

			const { serverURL } = props;

			addServer(serverURL || defaultServerURL);

			setServerURL('');
		};

		const handleInputBlur = () => {
			validate();
		};

		const handleInputChange = (event) => {
			setServerURL(event.currentTarget.value);
		};

		window.addEventListener('online', handleConnectionChange);
		window.addEventListener('offline', handleConnectionChange);
		handleConnectionChange();

		section.querySelector('#login-card').addEventListener('submit', handleFormSubmit, false);
		section.querySelector('#login-card [name="host"]').addEventListener('blur', handleInputBlur, false);
		section.querySelector('#login-card [name="host"]').addEventListener('input', handleInputChange, false);

		document.querySelector('.app-page').classList.remove('app-page--loading');
	}

	const {
		visible,
		isOffline,
		serverURL,
		isValidating,
		errorMessage,
	} = props;

	document.body.classList.toggle('offline', isOffline);

	section.querySelector('#login-card .connect__prompt').innerText =
		errorMessage ? t('landing.invalidUrl') : t('landing.inputUrl');

	section.querySelector('#login-card [name="host"]').setAttribute('placeholder', defaultServerURL);
	section.querySelector('#login-card [name="host"]').classList.toggle('wrong', !!errorMessage);
	section.querySelector('#login-card [name="host"]').value = serverURL;

	section.querySelector('#login-card #invalidUrl').style.display = errorMessage ? 'block' : 'none';
	section.querySelector('#login-card #invalidUrl').innerHTML = errorMessage;

	section.querySelector('#login-card .connect__error').innerText = t('error.offline');

	section.querySelector('#login-card .login').innerText =
		isValidating ? t('landing.validating') : t('landing.connect');
	section.querySelector('#login-card .login').toggleAttribute('disabled', isValidating);

	document.querySelector('.landing-view').classList.toggle('hide', !visible);
};

export default {
	setProps,
};
